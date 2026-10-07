(() => {
  'use strict';
  // Paramètres › Centre › Tableau (docs/technique/ODV_ORDRES.md § 4.1) : réglages partagés de la page Tableau,
  // data/config/odv.json (OdvOrders.loadConfig / saveConfig, shared/odv_orders_store.js) — terrain, réseau par
  // défaut, délai des CR avant MNE, jours affichés et heures de service, modèles de plaquettes (vols, divers, contrôle),
  // couleurs des indicatifs, créneaux LL / RTBA de repli, personnel (Staff / Membres, couleur, ordre), récurrences.
  // Rubrique inscrite auprès de SettingsPanels (shared/settings_panels.js), page REPOSITORY_TREE.settings.sections.odvOrders.
  const SP = window.SettingsPanels;
  if (!SP?.add) return;
  const K = window.RepositoryKit,
    esc = K.esc,
    tf = K.tf;
  // libellé français inscrit pour la traduction du DOM (SettingsPanels.L), ligne gardée ici pour les textes calculés
  const ROWS = [];
  /** Inscrit une ligne [fr, en, de, es] (gardée dans ROWS) et renvoie le libellé de SettingsPanels.L. */
  const L = (...row) => {
    ROWS.push(row);
    return SP.L(...row);
  };
  /** Données et règles du Tableau (shared/odv_orders_store.js), lues à l'usage. */
  const O = () => window.OdvOrders;
  const DAYS = [L('Lundi', 'Monday', 'Montag', 'Lunes'), L('Mardi', 'Tuesday', 'Dienstag', 'Martes'), L('Mercredi', 'Wednesday', 'Mittwoch', 'Miércoles'), L('Jeudi', 'Thursday', 'Donnerstag', 'Jueves'), L('Vendredi', 'Friday', 'Freitag', 'Viernes'), L('Samedi', 'Saturday', 'Samstag', 'Sábado'), L('Dimanche', 'Sunday', 'Sonntag', 'Domingo')];
  const SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const H = {
    general: L('Général', 'General', 'Allgemein', 'General'),
    terrain: L('Terrain (OACI) : jour et nuit aéronautiques', 'Airfield (ICAO): aeronautical day and night', 'Flugplatz (ICAO): Luftfahrttag und -nacht', 'Aeródromo (OACI): día y noche aeronáuticos'),
    reseau: L('Réseau par défaut des vols', 'Default network of flights', 'Standardnetzwerk der Flüge', 'Red por defecto de los vuelos'),
    delai: L('Délai sans CR avant MNE (heures)', 'Delay without report before MNE (hours)', 'Frist ohne Bericht bis MNE (Stunden)', 'Plazo sin informe antes de MNE (horas)'),
    nbJours: L('Jours affichés', 'Days shown', 'Angezeigte Tage', 'Días mostrados'),
    jours: L('Heures de service (z)', 'Duty hours (z)', 'Dienstzeiten (z)', 'Horas de servicio (z)'),
    debut: L('Début', 'Start', 'Beginn', 'Inicio'),
    fin: L('Fin', 'End', 'Ende', 'Fin'),
    vols: L('Modèles de vols', 'Flight templates', 'Flugvorlagen', 'Plantillas de vuelos'),
    divers: L('Modèles de divers', 'Miscellaneous templates', 'Vorlagen Sonstiges', 'Plantillas de varios'),
    controle: L('Modèles de contrôle', 'Control templates', 'Vorlagen Lotsendienst', 'Plantillas de control'),
    libelle: L('Libellé', 'Label', 'Bezeichnung', 'Etiqueta'),
    duree: L('Durée (min)', 'Duration (min)', 'Dauer (min)', 'Duración (min)'),
    couleur: L('Couleur', 'Colour', 'Farbe', 'Color'),
    fond: L('Fond plein', 'Solid fill', 'Gefüllt', 'Relleno'),
    parIndicatif: L('Couleur de l’indicatif', 'Callsign colour', 'Farbe des Rufzeichens', 'Color del indicativo'),
    configs: L('Configurations d’avion (KNON, TALIOS…)', 'Aircraft configurations (KNON, TALIOS…)', 'Luftfahrzeugkonfigurationen (KNON, TALIOS…)', 'Configuraciones de aeronave (KNON, TALIOS…)'),
    texte: L('Texte', 'Text', 'Text', 'Texto'),
    indicatifs: L('Couleurs des indicatifs', 'Callsign colours', 'Farben der Rufzeichen', 'Colores de los indicativos'),
    prefixe: L('Préfixe', 'Prefix', 'Präfix', 'Prefijo'),
    contour: L('Contour', 'Outline', 'Rahmen', 'Contorno'),
    ll: L('Créneaux LL / RTBA (repli)', 'LL / RTBA slots (fallback)', 'LL-/RTBA-Zeitfenster (Ersatz)', 'Franjas LL / RTBA (respaldo)'),
    nom: L('Nom', 'Name', 'Name', 'Nombre'),
    joursSem: L('Jours', 'Days', 'Tage', 'Días'),
    sia: L('Zone de la base', 'Database area', 'Gebiet der Datenbank', 'Zona de la base'),
    personnel: L('Personnel', 'Personnel', 'Personal', 'Personal'),
    groupe: L('Groupe', 'Group', 'Gruppe', 'Grupo'),
    staff: L('Staff', 'Staff', 'Stab', 'Staff'),
    autre: L('Membres', 'Members', 'Mitglieder', 'Miembros'),
    ordre: L('Ordre', 'Order', 'Reihenfolge', 'Orden'),
    recurrences: L('Récurrences', 'Recurrences', 'Wiederholungen', 'Recurrencias'),
    ajouter: L('Ajouter', 'Add', 'Hinzufügen', 'Añadir'),
    retirer: L('Retirer', 'Remove', 'Entfernen', 'Quitar'),
    rythmes: {
      quotidien: L('chaque jour', 'every day', 'täglich', 'cada día'),
      hebdo: L('chaque semaine', 'every week', 'wöchentlich', 'cada semana'),
      bimensuel: L('une semaine sur deux', 'every other week', 'alle zwei Wochen', 'cada dos semanas')
    }
  };
  // libellé dans la langue courante : ligne [fr, en, de, es] inscrite par L (SettingsPanels.rows), sinon le français
  const T = fr => K.t(ROWS.find(r => r[0] === fr) || [fr]);
  /** Champ data-k d'une ligne du tableau. */
  const val = (tr, k) => tr.querySelector(`[data-k="${k}"]`);
  /** Champ couleur ; gris ardoise si la valeur manque. */
  const color = (k, v) => `<input type="color" data-k="${k}" value="${esc(v || '#64748b')}">`;
  /** Champ texte (attrs : attributs HTML ajoutés tels quels). */
  const text = (k, v, attrs = '') => `<input data-k="${k}" value="${esc(v ?? '')}"${attrs}>`;
  // bouton « Retirer » d'une ligne (tr ou li), géré par body.onclick
  const drop = `<button type="button" data-drop title="${esc(H.retirer)}">✕</button>`;

  /**
   *  Membres proposés dans « Personnel » : déjà réglés, utilisateurs actifs de la suite (SuiteUsers) et pilotes
   *  de l'index des disponibilités (data/disponibilites/_index.json), triés.
   */
  async function membersOf(cfg) {
    const set = new Set(Object.keys(cfg.personnel || {}));
    for (const u of await Promise.resolve(window.SuiteUsers?.list?.()).catch(() => []) || [])
      if (u?.trigramme && u.actif !== false) set.add(u.trigramme.toUpperCase());
    const idx = await window.MissionAssignments?.readData?.('disponibilites/_index.json').catch(() => null);
    for (const tri of Object.keys(idx?.pilots || {})) set.add(tri);
    return [...set].sort();
  }

  // rubrique « Tableau » du groupe Centre : rendu, collecte, enregistrement et retour aux valeurs par défaut
  SP.add({
    id: 'odvOrders',
    group: L('Centre (CPCO)', 'Centre (CPCO)', 'Zentrum (CPCO)', 'Centro (CPCO)'),
    title: L('Tableau', 'Board', 'Einsatztafel', 'Tablero'),
    intro: L('Réglages partagés de la page Tableau (data/config/odv.json, synchronisé) : terrain, réseau par défaut, délai des CR, heures de service, modèles de plaquettes, couleurs des indicatifs, créneaux LL / RTBA de repli, personnel, récurrences.', 'Shared settings of the Board page (data/config/odv.json, synchronised): airfield, default network, report delay, duty hours, strip templates, callsign colours, fallback LL / RTBA slots, personnel, recurrences.', 'Gemeinsame Einstellungen der Seite Einsatztafel (data/config/odv.json, synchronisiert): Flugplatz, Standardnetzwerk, Berichtsfrist, Dienstzeiten, Streifenvorlagen, Rufzeichenfarben, Ersatz-LL-/RTBA-Zeitfenster, Personal, Wiederholungen.', 'Ajustes compartidos de la página Tablero (data/config/odv.json, sincronizado): aeródromo, red por defecto, plazo de informes, horas de servicio, plantillas de fichas, colores de indicativos, franjas LL / RTBA de respaldo, personal, recurrencias.'),
    /** Construit la rubrique d'après les réglages relus (fresh) ;
     *  api (SettingsPanels) : changed, saved, status, actions. */
    async render(body, api) {
      if (!O()) {
        body.textContent = 'OdvOrders ?';
        return;
      }
      let cfg = structuredClone(await O().loadConfig({
        fresh: true
      }));
      const members = await membersOf(cfg);
      const prefixes = window.MISSION_CALLSIGNS?.table?.map(x => x.prefix).filter(Boolean) || [];
      /** Ligne d'un modèle de plaquette (kind : vols, divers, controle) ;
       *  « Couleur de l'indicatif » pour les vols seulement. */
      const tplRow = (kind, m) => `<tr data-id="${esc(m.id || O().uid())}"><td>${text('libelle', m.libelle)}</td><td>${text('duree', m.duree, ' type="number" min="5" step="5" style="width:6em"')}</td><td>${color('couleur', m.couleur)}</td><td><input type="checkbox" data-k="fond"${m.fond ? ' checked' : ''}></td>${kind === 'vols' ? `<td><input type="checkbox" data-k="parIndicatif"${m.parIndicatif ? ' checked' : ''}></td>` : ''}<td>${drop}</td></tr>`;
      /** Tableau des modèles d'un genre, avec son bouton « Ajouter ». */
      const tplTable = kind => `<h3>${esc(H[kind])}</h3><div class="da-scroll"><table class="da-table"><thead><tr><th>${esc(H.libelle)}</th><th>${esc(H.duree)}</th><th>${esc(H.couleur)}</th><th>${esc(H.fond)}</th>${kind === 'vols' ? `<th>${esc(H.parIndicatif)}</th>` : ''}<th></th></tr></thead><tbody data-tpl="${kind}" data-no-i18n>${(cfg.modeles?.[kind] || []).map(m => tplRow(kind, m)).join('')}</tbody></table></div><button type="button" data-add="${kind}">${esc(H.ajouter)}</button>`;
      /** Ligne des couleurs d'un préfixe d'indicatif (préfixes connus proposés par la datalist odvoSetCs). */
      const csRow = (p, c) => `<tr><td>${text('prefixe', p, ' list="odvoSetCs"')}</td><td>${color('fond', c?.fond)}</td><td>${color('contour', c?.contour)}</td><td>${drop}</td></tr>`;
      /** Ligne d'un créneau LL / RTBA de repli : nom, heures, jours de la semaine, couleur, zone de la base (sia). */
      const llRow = l => `<tr><td>${text('nom', l.nom)}</td><td>${text('debut', l.debut, ' type="time" step="300"')}</td><td>${text('fin', l.fin, ' type="time" step="300"')}</td><td>${SHORT.map((s, i) => `<label title="${esc(T(DAYS[i]))}"><input type="checkbox" data-j="${i + 1}"${(l.jours || []).includes(i + 1) ? ' checked' : ''}>${s}</label>`).join(' ')}</td><td>${color('couleur', l.couleur || '#4ADE80')}</td><td>${text('sia', l.sia || '', ' style="width:9em"')}</td><td>${drop}</td></tr>`;
      /** Résumé d'une récurrence (élément, rythme, jour, heure, période) ; ici, on ne peut que la retirer. */
      const recText = r => `${esc(r.element?.libelle || r.element?.texte || r.element?.type || '')} · ${esc(T(H.rythmes[r.rythme] || r.rythme))}${r.rythme !== 'quotidien' ? ' · ' + esc(DAYS[(+r.jour || 1) - 1]) : ''} · ${esc(r.element?.debut || '')}z · ${esc(r.debut)} → ${esc(r.fin || '…')}`;
      /** Redessine toute la rubrique d'après cfg. */
      const draw = () => {
        body.innerHTML = `<div class="odvo-set">
          <h3>${esc(H.general)}</h3>
          <div class="da-grid">
            <label>${esc(H.terrain)} ${text('terrain', cfg.terrain, ' maxlength="4" style="width:6em;text-transform:uppercase" data-g')}</label>
            <label>${esc(H.reseau)} <select data-k="reseau" data-g>${['IVAO', 'VATSIM'].map(x => `<option${x === cfg.reseau ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
            <label>${esc(H.delai)} ${text('crDelaiHeures', cfg.crDelaiHeures ?? 48, ' type="number" min="1" step="1" style="width:6em" data-g')}</label>
            <label>${esc(H.nbJours)} ${text('nbJours', cfg.nbJours || 7, ' type="number" min="1" max="7" style="width:5em" data-g')}</label>
          </div>
          <h3>${esc(H.jours)}</h3>
          <table class="da-table"><thead><tr><th></th><th>${esc(H.debut)}</th><th>${esc(H.fin)}</th></tr></thead><tbody data-jours data-no-i18n>${DAYS.map((d, i) => `<tr data-j="${i + 1}"><th>${esc(T(d))}</th><td>${text('debut', cfg.jours?.[i + 1]?.debut || '06:00', ' type="time" step="900"')}</td><td>${text('fin', cfg.jours?.[i + 1]?.fin || '23:00', ' type="time" step="900"')}</td></tr>`).join('')}</tbody></table>
          ${tplTable('vols')}${tplTable('divers')}${tplTable('controle')}
          <h3>${esc(H.indicatifs)}</h3>
          <datalist id="odvoSetCs">${prefixes.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
          <table class="da-table"><thead><tr><th>${esc(H.prefixe)}</th><th>${esc(H.fond)}</th><th>${esc(H.contour)}</th><th></th></tr></thead><tbody data-cs data-no-i18n>${Object.entries(cfg.indicatifs || {}).map(([p, c]) => csRow(p, c)).join('')}</tbody></table>
          <button type="button" data-add="cs">${esc(H.ajouter)}</button>
          <h3>${esc(H.configs)}</h3>
          <table class="da-table"><thead><tr><th>${esc(H.texte)}</th><th>${esc(H.couleur)}</th><th></th></tr></thead><tbody data-cfgs data-no-i18n>${(cfg.configs || []).map(k => `<tr><td>${text('texte', k.texte, ' style="width:9em;text-transform:uppercase"')}</td><td>${color('couleur', k.couleur)}</td><td>${drop}</td></tr>`).join('')}</tbody></table>
          <button type="button" data-add="cfg">${esc(H.ajouter)}</button>
          <h3>${esc(H.ll)}</h3>
          <div class="da-scroll"><table class="da-table"><thead><tr><th>${esc(H.nom)}</th><th>${esc(H.debut)}</th><th>${esc(H.fin)}</th><th>${esc(H.joursSem)}</th><th>${esc(H.couleur)}</th><th>${esc(H.sia)}</th><th></th></tr></thead><tbody data-ll data-no-i18n>${(cfg.ll || []).map(llRow).join('')}</tbody></table></div>
          <button type="button" data-add="ll">${esc(H.ajouter)}</button>
          <h3>${esc(H.personnel)}</h3>
          <div class="da-scroll"><table class="da-table"><thead><tr><th></th><th>${esc(H.groupe)}</th><th>${esc(H.couleur)}</th><th>${esc(H.ordre)}</th></tr></thead><tbody data-pers data-no-i18n>${members.map((tri, i) => {
            const p = cfg.personnel?.[tri] || {};
            return `<tr data-tri="${esc(tri)}"><th>${esc(tri)}</th><td><select data-k="groupe"><option value="autre">${esc(T(H.autre))}</option><option value="staff"${p.groupe === 'staff' ? ' selected' : ''}>${esc(T(H.staff))}</option></select></td><td><input type="checkbox" data-k="hasColor"${p.couleur ? ' checked' : ''}> ${color('couleur', p.couleur || '#92d050')}</td><td>${text('ordre', p.ordre ?? i, ' type="number" step="1" style="width:5em"')}</td></tr>`;
          }).join('')}</tbody></table></div>
          <h3>${esc(H.recurrences)}</h3>
          <ul data-rec data-no-i18n>${(cfg.recurrences || []).map(r => `<li data-id="${esc(r.id)}">${recText(r)} ${drop}</li>`).join('') || '<li>—</li>'}</ul>
        </div>`;
      };
      /**
       *  Réglages lus dans le formulaire, fusionnés sur cfg : lignes sans libellé, préfixe, texte ou nom retirées ;
       *  personnel gardé seulement s'il diffère du défaut (Staff, couleur ou ordre) ; récurrences retirées supprimées.
       */
      const collect = () => {
        // champ général (data-g)
        const g = k => body.querySelector(`[data-k="${k}"][data-g]`)?.value;
        // modèles d'un genre ; les champs non affichés du modèle existant sont gardés
        const tpl = kind => [...body.querySelectorAll(`[data-tpl="${kind}"] tr`)].map(tr => ({
          ...((cfg.modeles?.[kind] || []).find(m => m.id === tr.dataset.id) || {}),
          id: tr.dataset.id,
          libelle: val(tr, 'libelle').value.trim(),
          duree: Math.max(5, +val(tr, 'duree').value || 60),
          couleur: val(tr, 'couleur').value,
          fond: val(tr, 'fond').checked ? val(tr, 'couleur').value : null,
          ...(kind === 'vols' ? {
            parIndicatif: val(tr, 'parIndicatif').checked
          } : {})
        })).filter(m => m.libelle);
        const keep = new Set([...body.querySelectorAll('[data-rec] li[data-id]')].map(li => li.dataset.id));
        return {
          ...cfg,
          terrain: String(g('terrain') || '').trim().toUpperCase(),
          reseau: g('reseau') || 'IVAO',
          crDelaiHeures: Math.max(1, +g('crDelaiHeures') || 48),
          nbJours: Math.max(1, Math.min(7, +g('nbJours') || 7)),
          jours: Object.fromEntries([...body.querySelectorAll('[data-jours] tr')].map(tr => [tr.dataset.j, {
            debut: val(tr, 'debut').value || '06:00',
            fin: val(tr, 'fin').value || '23:00'
          }])),
          modeles: {
            ...(cfg.modeles || {}),
            vols: tpl('vols'),
            divers: tpl('divers'),
            controle: tpl('controle')
          },
          indicatifs: Object.fromEntries([...body.querySelectorAll('[data-cs] tr')].map(tr => [val(tr, 'prefixe').value.trim().toUpperCase(), {
            fond: val(tr, 'fond').value,
            contour: val(tr, 'contour').value
          }]).filter(([p]) => p)),
          configs: [...body.querySelectorAll('[data-cfgs] tr')].map(tr => ({
            texte: val(tr, 'texte').value.trim().toUpperCase(),
            couleur: val(tr, 'couleur').value
          })).filter(k => k.texte),
          ll: [...body.querySelectorAll('[data-ll] tr')].map(tr => ({
            nom: val(tr, 'nom').value.trim(),
            debut: val(tr, 'debut').value,
            fin: val(tr, 'fin').value,
            jours: [...tr.querySelectorAll('[data-j]:checked')].map(x => +x.dataset.j),
            couleur: val(tr, 'couleur').value,
            sia: val(tr, 'sia').value.trim() || null
          })).filter(l => l.nom && l.debut && l.fin),
          personnel: Object.fromEntries([...body.querySelectorAll('[data-pers] tr')].map(tr => [tr.dataset.tri, {
            groupe: val(tr, 'groupe').value,
            couleur: val(tr, 'hasColor').checked ? val(tr, 'couleur').value : '',
            ordre: +val(tr, 'ordre').value || 0
          }]).filter(([, p]) => p.groupe === 'staff' || p.couleur || p.ordre)),
          recurrences: (cfg.recurrences || []).filter(r => keep.has(r.id))
        };
      };
      draw();
      body.oninput = body.onchange = () => api.changed();
      // « Retirer » enlève la ligne ; « Ajouter » collecte la saisie puis redessine avec une ligne par défaut en plus
      body.onclick = e => {
        const add = e.target.closest('[data-add]')?.dataset.add,
          dr = e.target.closest('[data-drop]');
        if (dr) {
          (dr.closest('tr') || dr.closest('li')).remove();
          api.changed();
        }
        if (!add) return;
        cfg = collect();
        if (add === 'cs') cfg.indicatifs = {
          ...cfg.indicatifs,
          [`NOUVEAU${Object.keys(cfg.indicatifs).length + 1}`]: {
            fond: '#64748b',
            contour: '#000000'
          }
        };
        else if (add === 'cfg') cfg.configs = [...(cfg.configs || []), {
          texte: 'CONFIG',
          couleur: '#64748b'
        }];
        else if (add === 'll') cfg.ll = [...cfg.ll, {
          nom: 'RTBA',
          debut: '08:00',
          fin: '10:00',
          jours: [1, 2, 3, 4, 5],
          couleur: '#4ADE80'
        }];
        else cfg.modeles[add] = [...(cfg.modeles[add] || []), {
          id: O().uid(),
          libelle: add.toUpperCase(),
          duree: 60,
          couleur: '#64748b',
          fond: null
        }];
        draw();
        api.changed();
      };
      api.status(tf(['{v} modèle(s), {l} créneau(x) LL, {r} récurrence(s)', '{v} template(s), {l} LL slot(s), {r} recurrence(s)', '{v} Vorlage(n), {l} LL-Zeitfenster, {r} Wiederholung(en)', '{v} plantilla(s), {l} franja(s) LL, {r} recurrencia(s)'], {
        v: ['vols', 'divers', 'controle'].reduce((n, k) => n + (cfg.modeles?.[k]?.length || 0), 0),
        l: (cfg.ll || []).length,
        r: (cfg.recurrences || []).length
      }));
      api.actions([
        // enregistrement local (navigateur) accepté malgré l'erreur ; message selon l'endroit écrit
        [L('Enregistrer', 'Save', 'Speichern', 'Guardar'), async () => {
          const next = collect();
          const r = await O().saveConfig(next).catch(err => ({
            error: err
          }));
          if (r?.error && r.where !== 'local') return api.status(String(r.error?.message || r.error));
          cfg = structuredClone(next);
          api.saved();
          api.status(r?.where === 'folder' ? K.t(['Réglages enregistrés.', 'Settings saved.', 'Einstellungen gespeichert.', 'Ajustes guardados.']) : K.t(['Réglages enregistrés dans ce navigateur.', 'Settings saved in this browser.', 'Einstellungen in diesem Browser gespeichert.', 'Ajustes guardados en este navegador.']));
        }, 'primary'],
        // défauts affichés, écrits par « Enregistrer » ; personnel, indicatifs, LL et récurrences gardés
        [L('Valeurs par défaut', 'Default values', 'Standardwerte', 'Valores por defecto'), async () => {
          if (!await window.AppFramework.ask(K.t(['Revenir aux réglages par défaut du Tableau ? (personnel, couleurs des indicatifs, créneaux LL et récurrences gardés)', 'Back to the default Board settings? (personnel, callsign colours, LL slots and recurrences kept)', 'Zu den Standardeinstellungen der Einsatztafel zurück? (Personal, Rufzeichenfarben, LL-Zeitfenster und Wiederholungen bleiben)', '¿Volver a los ajustes por defecto del Tablero? (personal, colores de indicativos, franjas LL y recurrencias conservados)']))) return;
          const d = structuredClone(O().DEFAULT_CONFIG);
          cfg = {
            ...d,
            personnel: cfg.personnel,
            indicatifs: cfg.indicatifs,
            ll: cfg.ll,
            recurrences: cfg.recurrences
          };
          draw();
          api.changed();
        }]
      ]);
    }
  });
})();
