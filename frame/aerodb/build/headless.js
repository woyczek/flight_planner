/* Construction de la base aéronautique, sans fenêtre (frame/aerodb/build/headless.html ; tools/regen/base.py).
 *
 * Le lanceur lance un navigateur sans fenêtre et lui donne, dans le FRAGMENT de l'adresse (jamais envoyé au serveur ; l'adresse de départ du
 * navigateur est un petit fichier local qui y mène : le jeton n'est jamais dans sa ligne de commande) :
 *   job     identifiant du travail ;            t       jeton du travail (job.token) ;
 *   zones   les zones à construire (virgules) ;  zone    seulement en mode « une instance par zone » : la zone de cette instance (zones = toutes celles
 *                                                        du travail : le découpage des cases MORA, des villes et des axes en dépend) ;
 *   cycle   date du cycle (AAAA-MM-JJ) ;         personal  sources sous licence d'usage personnel déclarées par le propriétaire (virgules) ;
 *   in      fichiers de data/sia/ qui existent (chemins relatifs, séparés par « | ») : le tri (zone active, source cochée) est
 *           fait ici par AeroZones.fileWanted, la même règle que la construction dans la page.
 * Sans `zone`, UNE instance construit toutes les zones d'un coup avec les fonctions de la page V2 (SiaBase.buildZones : build, splitZones,
 * zoneBodies) et remet chaque zone dès qu'elle est prête ; avec `zone`, SiaBase.buildZone (cette zone seule). Elle lit les fichiers par
 * GET /data/sia/<chemin> et remet chaque zone par POST /__setup/regen/job/put { job, token, zone, files } (en-tête X-SOG-Setup: 1).
 * L'avancement et les échecs sortent par la console (lignes « SOGB {json} » que le lanceur lit ; jamais l'adresse ni le jeton) : aucune autre route.
 */
(() => {
  'use strict';
  const H = new URLSearchParams(location.hash.slice(1)),
    job = H.get('job') || '',
    token = H.get('t') || '',
    one = H.get('zone') || '',
    zones = (H.get('zones') || one).split(',').filter(Boolean),
    cycle = H.get('cycle') || '',
    personal = (H.get('personal') || '').split(',').filter(Boolean),
    inputs = (H.get('in') || '').split('|').filter(Boolean);
  try {
    history.replaceState(null, '', location.pathname); // le jeton ne reste pas dans l'adresse de la page
  } catch {
    /* sans importance */
  }
  const etat = document.getElementById('etat'),
    L = {
      fr: ['Construction', 'Zone construite', 'Échec'],
      en: ['Building', 'Zone built', 'Failed'],
      de: ['Aufbau', 'Zone gebaut', 'Fehlgeschlagen'],
      es: ['Construcción', 'Zona construida', 'Fallo']
    } [(navigator.language || 'fr').slice(0, 2)] || ['Construction', 'Zone construite', 'Échec'];
  /** Dit où en est la construction : la ligne d'état de la page et une ligne « SOGB {json} » dans la console (lue par le lanceur). zone :
   *  celle de l'instance, ou « * » quand elle construit toutes les zones. Jamais l'adresse, jamais le jeton. */
  const say = (o, text) => {
    console.log('SOGB ' + JSON.stringify({
      zone: one || '*',
      ...o
    }));
    if (text && etat.textContent !== text) etat.textContent = text;
  };
  const fail = (e, zone) => {
    say({
      ...(zone ? {
        zone
      } : {}),
      error: String(e?.message || e).slice(0, 300)
    }, `${L[2]} ${zone || one || ''}`);
  };
  addEventListener('error', e => fail(e.error || e.message));
  addEventListener('unhandledrejection', e => fail(e.reason));
  say({
    started: true
  }); // le lanceur supprime alors le fichier de départ (qui portait le jeton)

  /** Fichier de data/sia/ lu sur l'adresse du lanceur (Blob → File : même objet que celui d'un sélecteur de dossier). */
  async function fetchInput(rel) {
    const r = await fetch('/data/sia/' + rel.split('/').map(encodeURIComponent).join('/'), {
      cache: 'no-store'
    });
    if (!r.ok) throw new Error(`${rel} : HTTP ${r.status}`);
    const f = new File([await r.blob()], rel.split('/').pop());
    return rel.includes('/') ? Object.assign(f, {
      __rel: rel
    }) : f;
  }
  /** Remet la sortie d'une zone au lanceur (POST /__setup/regen/job/put) ; refus : le dit, les autres zones continuent. */
  async function put(zone, texts) {
      try {
        const res = await fetch('/__setup/regen/job/put', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-SOG-Setup': '1'
          },
          body: JSON.stringify({
            job,
            token,
            zone,
            files: texts
          })
        });
        if (!res.ok) throw new Error(`rendu refusé : HTTP ${res.status}`);
        say({
          zone,
          done: true
        }, `${L[1]} ${zone}`);
      } catch (e) {
        fail(e, zone);
      }
    }
    (async () => {
      if (!job || !token || !zones.length || !cycle) throw new Error('paramètres manquants (job, t, zones, cycle)');
      const SB = window.SiaBase;
      if (!SB) throw new Error('constructeurs absents (sia_base.js)');
      const Z = await SB.zones();
      if (!Z) throw new Error('zones absentes (aero_zones.js)');
      // les fichiers que cette construction lira (zones actives, sources cochées) : la règle de la page, appliquée aux noms
      const settings = SB.zoneSettings(Z, one || zones, personal),
        wanted = inputs.filter(rel => Z.fileWanted(rel, settings)),
        files = [],
        extra = {};
      say({
        sources: wanted.length
      }, `${L[0]} ${one || zones.join(' ')}`);
      for (const rel of wanted) {
        const f = await fetchInput(rel),
          parts = rel.split('/');
        if (parts.length === 1) files.push(f);
        else if (parts[0] === 'zones')(extra.aixm5 ||= []).push(f); // fichiers déposés à la main : lecteur choisi par l'extension
        else(extra[parts[0]] ||= []).push(f);
      }
      // avancement : « n sur m sources » = fichiers dont la lecture a commencé (la construction lit chacun une fois, en flux)
      let n = 0;
      for (const f of [...files, ...Object.values(extra).flat()]) {
        const stream = f.stream.bind(f);
        f.stream = () => {
          say({
            n: ++n,
            m: wanted.length
          });
          return stream();
        };
      }
      // la France a la priorité sur les autres sources : sans le SIA dans cette construction, les contours de ses FIR sont lus à part
      let priorityRings = null;
      const sia = inputs.find(rel => rel === `XML_SIA_${cycle}.xml`);
      if (!(one || zones).includes('fr') && sia) {
        const r = await fetch('/data/sia/' + sia, {
          cache: 'no-store'
        });
        if (!r.ok) throw new Error(`${sia} : HTTP ${r.status}`);
        priorityRings = SB.priorityRingsFromXmlSia(new TextDecoder('iso-8859-1').decode(await r.arrayBuffer()));
      }
      let last = 0;
      const opts = {
        cycle,
        personal,
        extra,
        priorityRings,
        progress: (label, frac) => {
          const now = Date.now();
          if (now - last > 1000) { // une ligne par seconde au plus
            last = now;
            say({
              frac: +frac.toFixed(3),
              label: String(label).slice(0, 120)
            });
          }
        }
      };
      if (one) {
        const r = await SB.buildZone(files, {
          ...opts,
          zone: one,
          zones
        });
        await put(one, r.texts);
      } else await SB.buildZones(files, {
        ...opts,
        zones,
        onZone: put
      });
    })().catch(e => fail(e));
})();
