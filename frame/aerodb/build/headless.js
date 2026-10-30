/* Construction de la base aéronautique, sans fenêtre (frame/aerodb/build/headless.html ; tools/regen/base.py).
 *
 * Le lanceur lance un navigateur sans fenêtre sur l'adresse de CETTE page avec pour seul fragment le travail : `#job=<id>`. Ni jeton, ni zone, ni fichier
 * dans l'adresse ni dans la ligne de commande. La page :
 *   1. lit le fragment puis l'efface (history.replaceState) ;
 *   2. fait UN POST /__setup/regen/job/claim { job } (même origine, en-tête X-SOG-Setup: 1) qui lui rend ce que le verbe a déposé (job.offer) et le jeton du
 *      travail : { zones, cycle, personal, inputs, job, token } — le claim vaut « démarré » ; un second claim est refusé (409) ;
 *   3. VÉRIFIE tout cela avant de rien lire : le travail est celui du fragment, le cycle AAAA-MM-JJ, chaque zone connue, chaque source un identifiant, chaque
 *      fichier un nom relatif sans « .. », sans composant vide, sans « / » de tête, sans « \ » ni « : » ; sinon elle le dit (page-error) et ne lit rien ;
 *   4. lit les fichiers qu'elle veut (le tri zone active / source cochée est fait ici par AeroZones.fileWanted, la même règle que la page V2) par
 *      GET /data/sia/<chemin> ;
 *   5. construit toutes les zones d'un coup avec les fonctions de la page V2 (SiaBase.buildZones : build, splitZones, zoneBodies) et remet chaque zone dès
 *      qu'elle est prête par POST /__setup/regen/job/put { job, token, zone, files } (en-tête X-SOG-Setup: 1).
 * L'avancement et les échecs sortent par la console (lignes « SOGB {json} » que le lanceur lit ; jamais l'adresse ni le jeton) : aucune autre route.
 */
(() => {
  'use strict';
  const jobId = new URLSearchParams(location.hash.slice(1)).get('job') || '';
  try {
    history.replaceState(null, '', location.pathname); // plus rien dans l'adresse de la page
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
  /** Dit où en est la construction : la ligne d'état de la page et une ligne « SOGB {json} » dans la console (lue par le lanceur). zone : « * » quand
   *  il s'agit de toute la construction. Jamais l'adresse, jamais le jeton. */
  const say = (o, text) => {
    console.log('SOGB ' + JSON.stringify({
      zone: '*',
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
    }, `${L[2]} ${zone || ''}`);
  };
  addEventListener('error', e => fail(e.error || e.message));
  addEventListener('unhandledrejection', e => fail(e.reason));

  const ID = /^[A-Za-z0-9_-]{1,40}$/,
    TOKEN = /^[A-Za-z0-9_-]{20,100}$/,
    CYCLE = /^\d{4}-\d{2}-\d{2}$/,
    ZONE = /^[a-z0-9_-]{1,32}$/,
    SOURCE = /^[a-z0-9]{2,12}$/,
    PART = /^[\p{L}\p{N}_ .()+-]{1,150}$/u; // un composant de chemin : la règle SAFE_NAME de tools/regen/base.py
  /** Un nom relatif de data/sia/ : composants non vides, ni « . » ni « .. », pas de « / » de tête, de « \ » ni de « : » (le composant n'admet ni l'un ni l'autre). */
  const safeRel = rel => typeof rel === 'string' && rel.length <= 400 && rel.split('/').every(p => p !== '.' && p !== '..' && PART.test(
    p));
  /** Vérifie la réponse du claim avant d'en rien faire ; lève avec la raison. known : la liste des identifiants de zones. */
  function validate(o, known) {
    if (!o || typeof o !== 'object' || o.job !== jobId || !ID.test(jobId)) throw new Error(
      'the claimed job is not the one of the address');
    if (typeof o.token !== 'string' || !TOKEN.test(o.token)) throw new Error('bad token shape');
    if (typeof o.cycle !== 'string' || !CYCLE.test(o.cycle)) throw new Error('bad cycle');
    if (!Array.isArray(o.zones) || !o.zones.length || o.zones.length > 60 || o.zones.some(z => typeof z !== 'string' || !ZONE.test(z) || !
        known.has(z))) throw new Error('bad or unknown zone');
    if (!Array.isArray(o.personal) || o.personal.length > 10 || o.personal.some(p => typeof p !== 'string' || !SOURCE.test(p)))
      throw new Error('bad source id');
    if (!Array.isArray(o.inputs) || o.inputs.length > 5000 || !o.inputs.every(safeRel)) throw new Error('bad input file name');
  }
  const JSON_POST = {
    'Content-Type': 'application/json',
    'X-SOG-Setup': '1'
  };

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
    (async () => {
      if (!ID.test(jobId)) throw new Error('no job in the address');
      // 2. UN claim : ce que le verbe a déposé, et le jeton
      const claim = await fetch('/__setup/regen/job/claim', {
        method: 'POST',
        headers: JSON_POST,
        body: JSON.stringify({
          job: jobId
        })
      });
      if (!claim.ok) throw new Error(`claim refused: HTTP ${claim.status}`);
      const o = await claim.json(),
        SB = window.SiaBase;
      if (!SB) throw new Error('constructeurs absents (sia_base.js)');
      const Z = await SB.zones();
      if (!Z) throw new Error('zones absentes (aero_zones.js)');
      // 3. tout est vérifié avant la moindre lecture
      validate(o, new Set(Z.zones().map(z => z.id)));
      const {
        zones,
        cycle,
        personal,
        inputs,
        token
      } = o;
      say({
        started: true
      }, `${L[0]} ${zones.join(' ')}`);
      // 4. les fichiers que cette construction lira (zones actives, sources cochées) : la règle de la page, appliquée aux noms
      const settings = SB.zoneSettings(Z, zones, personal),
        wanted = inputs.filter(rel => Z.fileWanted(rel, settings)),
        files = [],
        extra = {};
      say({
        sources: wanted.length
      });
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
      if (!zones.includes('fr') && sia) {
        const r = await fetch('/data/sia/' + sia, {
          cache: 'no-store'
        });
        if (!r.ok) throw new Error(`${sia} : HTTP ${r.status}`);
        priorityRings = SB.priorityRingsFromXmlSia(new TextDecoder('iso-8859-1').decode(await r.arrayBuffer()));
      }
      /** Remet la sortie d'une zone au lanceur (POST /__setup/regen/job/put) ; refus : le dit, les autres zones continuent. */
      const put = async (zone, texts) => {
        try {
          const res = await fetch('/__setup/regen/job/put', {
            method: 'POST',
            headers: JSON_POST,
            body: JSON.stringify({
              job: jobId,
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
      };
      // 5. toutes les zones d'un coup, comme la page V2, chacune remise dès qu'elle est prête
      let last = 0;
      await SB.buildZones(files, {
        zones,
        cycle,
        personal,
        extra,
        priorityRings,
        onZone: put,
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
      });
    })().catch(e => fail(e));
})();
