// V3 atmosphere — la ligne « Synoptique monde » (SOG-0138) : sans publication du synoptique monde, ou avec une publication de plus de 12 h,
// une ligne sur la carte le dit et offre « Construire » — le travail weather/world { action: 'build' } du lanceur de ce poste (tools/regen/
// weather.py, GFS 1° par NOMADS, environ 2 min), suivi pas à pas ; la couche arrive sur la carte quand il est fini. Sans lanceur, la ligne
// dit où le faire. Jamais d'appel hors du lanceur ; aucune écriture : le lanceur publie sous data/local/weather/world/ (jamais synchronisé).

import {
  esc
} from './fmt.js';

/** Au-delà, la publication est dite ancienne (un run GFS toutes les six heures : deux runs manqués). */
export const STALE_MS = 12 * 3600e3;
/** Les raisons d'un échec du travail, en mots du pilote (le code du lanceur, reason). */
const WHY = {
  'no-run': 'wbWhyNoRun',
  invalid: 'wbWhyInvalid',
  timeout: 'wbWhyTimeout',
  cancelled: 'wbWhyCancelled',
  'too-soon': 'wbWhySoon',
  failed: 'wbWhyFailed'
};

/** La ligne : box (l'élément), ctx (weather.world, launcher, notify), F (textes et dates), reload (relit la couche de la carte). */
export function createWorldBuild({
  box,
  ctx,
  F,
  reload,
  hold = null, // ctx.placeholder : la place de la bande tant que l'index n'est pas lu
  alive = () => true
}) {
  const T = F.T;
  const S = {
    index: undefined, // undefined : pas encore lu ; null : aucune publication ; { built, run } sinon
    phase: 'idle', // idle | building | failed
    n: 0,
    total: 0,
    why: '',
    wait: 0,
    since: 0 // le début de la construction (ms) : la durée écoulée est dite tant que le lanceur ne donne pas de vraies étapes
  };
  let html = '',
    tick = 0;
  /** « 45 s », « 1 min 12 s » : la durée écoulée de la construction. */
  const lapse = ms => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return s < 60 ? `${s} s` : `${Math.floor(s / 60)} ${T('wbMin')} ${s % 60} s`;
  };
  /** Réécrit la ligne seulement si son texte change. */
  function paint() {
    const old = S.index === null || (S.index && Date.now() - S.index.built * 1000 > STALE_MS),
      show = S.phase !== 'idle' || old; // pas de ligne tant que l'index n'est pas lu, ni pour une publication fraîche
    let h = '';
    if (show) {
      const can = !!ctx.launcher;
      // les étapes du lanceur (n/25) quand il en donne, une seule étape n'en est pas une ; la durée écoulée dans tous les cas
      if (S.phase === 'building') h = `<span role="status">${esc(T('wbBuilding'))}${S.total > 1 ? ` ${S.n}/${S.total}` : ''} · ${esc(lapse(Date.now() - S.since))}</span>`;
      else {
        const what = S.phase === 'failed' ? `${esc(T('wbFailed', {
          why: T(WHY[S.why] || 'wbWhyFailed', {
            n: S.wait
          })
        }))}` : S.index ? esc(T('wbOld', {
          at: F.fmtWhen(S.index.built)
        })) : esc(T('wbNone'));
        h = `<span${S.phase === 'failed' ? ' role="alert"' : ''}>${what}</span> ${can ? `<button type="button" class="f-btn at-wb-go" data-at="wbBuild">${esc(T(S.phase === 'failed' ? 'wbRetry' : 'wbBuild'))}</button>` : `<span class="at-wb-no">${esc(T('wbNoLauncher'))}</span>`}`;
      }
    }
    if (h !== html) {
      html = h;
      box.innerHTML = h;
    }
    if (!holding && box.hidden !== !h) box.hidden = !h;
  }
  let holding = !!hold;
  /** L'index lu : la bande garde sa hauteur si elle a quelque chose à dire, sinon la réserve s'en va (une fois). */
  function release() {
    if (!holding) return;
    holding = false;
    hold(!!html);
    paint();
  }
  /** L'index de la publication, tel que le cadre le garde. */
  function read() {
    return Promise.resolve(ctx.weather?.world?.()).then(w => {
      if (!alive()) return;
      S.index = w && Number.isFinite(+w.built) ? {
        built: +w.built
      } : null;
      paint();
      release();
    }, () => {
      if (!alive()) return;
      S.index = null;
      paint();
      release();
    });
  }
  /** Lance la construction (une à la fois) et la suit ; la couche de la carte est relue à la fin. */
  async function build() {
    if (S.phase === 'building' || !ctx.launcher) return;
    Object.assign(S, {
      phase: 'building',
      n: 0,
      total: 0,
      why: '',
      wait: 0,
      since: Date.now()
    });
    paint();
    // une horloge, pas un rattrapage : la durée écoulée avance chaque seconde (paint n'écrit que si le texte change), arrêtée à la fin
    clearInterval(tick);
    tick = setInterval(() => alive() && S.phase === 'building' ? paint() : clearInterval(tick), 1000);
    let r = null;
    try {
      r = await ctx.launcher.job('regen/job', {
        set: 'weather',
        verb: 'world',
        args: {
          action: 'build'
        }
      }, {
        onProgress: p => {
          if (!alive() || S.phase !== 'building') return;
          const n = Number.isFinite(+p?.done) ? +p.done : 0,
            total = Number.isFinite(+p?.total) ? +p.total : 0;
          if (n !== S.n || total !== S.total) {
            S.n = n;
            S.total = total;
            paint();
          }
        }
      });
    } catch {
      r = null;
    }
    clearInterval(tick);
    if (!alive()) return;
    const res = r?.result;
    if (r && r.ok !== false && !['error', 'cancelled', 'interrupted'].includes(r.state) && res?.ok !== false) {
      S.phase = 'idle';
      await reload(); // la couche : l'index relu sans attendre, ses échéances à leur tour
      await read();
      ctx.notify?.(T('wbDone'), 'info');
      return;
    }
    S.phase = 'failed';
    S.why = r?.offline ? 'failed' : String(res?.reason || r?.reason || 'failed');
    S.wait = Number.isFinite(+r?.wait) ? Math.ceil(+r.wait) : 0;
    paint();
  }
  box.addEventListener('click', e => {
    if (e.target.closest('[data-at="wbBuild"]')) build();
  });
  paint();
  read();
  return {
    state: S,
    build,
    refresh: read,
    paint
  };
}
