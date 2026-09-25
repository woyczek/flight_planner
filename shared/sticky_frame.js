/* =====================================================================================================
   StickyFrame — cadres « semi-mobiles » du framework (X-Plane Web Suite)
   -----------------------------------------------------------------------------------------------------
   Deux comportements pour un bloc de colonne latérale qui doit rester lisible pendant le défilement :

   StickyFrame.stick(el, { top })
     Collant CSS classique (position: sticky) sous l'en-tête. Si le bloc est plus haut que la fenêtre,
     son décalage devient négatif : on défile jusqu'à son bas avant qu'il ne se colle (tout reste
     accessible). Borné par son parent, comme tout sticky. Utilisé par le Studio cartographique.

   StickyFrame.follow(el, { anchor, stack, gap, media })
     Cadre qui accompagne un bloc « ancre » d'une autre colonne : il arrive avec l'ancre, reste collé
     sous l'en-tête (et sous les cadres « stack » qui le précèdent) tant que l'ancre est à l'écran, puis
     repart avec le bas de l'ancre. Les cadres d'un même conteneur ne se chevauchent pas : chacun reste
     sous le précédent. Positionnement absolu dans le conteneur (position: relative, posé par le module).
     Utilisé par le planificateur : bloc Résultat (ancre : colonne des courbes, stack) et panneaux
     d'explications (ancre : la rangée de leur courbe).
       anchor : élément de référence (obligatoire) ;
       stack  : true si les cadres suivants se collent sous celui-ci (ex. bloc Résultat) ;
       gap    : écart en px entre cadres et sous l'en-tête (défaut 10) ;
       media  : requête média où le cadre est actif (défaut « (min-width: 801px) ») ; ailleurs, le
                cadre reste dans le flux normal (écrans étroits, colonnes empilées).
     Un cadre vide ou dont l'ancre est masquée est caché. Pendant qu'il est retenu (collé sous l'en-tête ou
     sous un autre cadre), il porte la classe « is-stuck » : la page peut alors le compacter (CSS).

   StickyFrame.headerBottom()  bas de l'en-tête collant de la page (px, repère de la fenêtre).
   StickyFrame.refresh()       recalcule tous les cadres (après un redessin qui change des hauteurs).
   ===================================================================================================== */
(() => {
  "use strict";
  const followed = [];            // { el, anchor, stack, gap, media }, dans l'ordre d'enregistrement
  let queued = false;

  /** Bas (px, repère fenêtre) de l'en-tête collant de la page : <header> ou barre de navigation du dépôt. */
  function headerBottom() {
    let b = 0;
    for (const h of document.querySelectorAll("header, .repo-nav, .repository-nav")) {
      const cs = getComputedStyle(h);
      if (cs.position === "sticky" || cs.position === "fixed") b = Math.max(b, h.getBoundingClientRect().bottom);
    }
    return b;
  }

  /** Collant CSS sous l'en-tête ; décalage négatif si le bloc dépasse la fenêtre. top : décalage voulu (px). */
  function stick(el, { top = 60 } = {}) {
    const fit = () => {
      el.style.top = "";
      if (getComputedStyle(el).position !== "sticky") return;      // colonnes empilées (media query de la page)
      el.style.top = Math.min(top, innerHeight - el.offsetHeight - 12) + "px";
    };
    new ResizeObserver(fit).observe(el); addEventListener("resize", fit); fit();
    return { refresh: fit };
  }

  /** Enregistre un cadre qui suit son ancre (voir l'en-tête). Retourne { refresh }. */
  function follow(el, { anchor, stack = false, gap = 10, media = "(min-width: 801px)" } = {}) {
    if (!el || !anchor) throw Error("StickyFrame.follow : el et anchor requis");
    const item = { el, anchor, stack, gap, mq: matchMedia(media) };
    followed.push(item);
    const box = el.parentElement; if (box && getComputedStyle(box).position === "static") box.style.position = "relative";
    const ro = new ResizeObserver(schedule); ro.observe(el); ro.observe(anchor);
    item.mq.addEventListener?.("change", schedule);
    schedule();
    return { refresh: layout };
  }

  /** Regroupe les recalculs d'une même frame d'affichage (défilement, redimensionnement, contenu). */
  function schedule() {
    if (queued) return; queued = true;
    // requestAnimationFrame ne tourne pas dans un onglet masqué : délai court en secours
    const run = () => { if (!queued) return; queued = false; layout(); };
    requestAnimationFrame(run); setTimeout(run, 50);
  }

  /** Place chaque cadre suivi : y = max(haut de l'ancre, min(ligne de collage, bas de l'ancre − hauteur)),
   *  sans chevaucher le cadre précédent du même conteneur. La ligne de collage descend sous les cadres « stack ». */
  function layout() {
    const byBox = new Map();
    for (const it of followed) {
      if (!it.el.isConnected) continue;
      const k = it.el.parentElement; if (!byBox.has(k)) byBox.set(k, []); byBox.get(k).push(it);
    }
    const hb = headerBottom();
    for (const [box, items] of byBox) {
      const boxTop = box.getBoundingClientRect().top;
      let line = hb, prevBottom = -Infinity;
      for (const it of items) {
        const { el, anchor, gap } = it;
        if (!it.mq.matches) { Object.assign(el.style, { position: "", top: "", left: "", right: "", maxHeight: "", visibility: "" }); continue; }
        const hidden = anchor.offsetParent === null || !el.textContent.trim() && !el.querySelector("svg,canvas,img,table");
        el.style.visibility = hidden ? "hidden" : "";
        Object.assign(el.style, { position: "absolute", left: "0", right: "0" });
        if (hidden) continue;
        const a = anchor.getBoundingClientRect(), h = el.offsetHeight, room = innerHeight - line - gap - gap;
        // cadre plus haut que la place restante : son bas se colle au bas de la fenêtre (tout reste lisible)
        const stuck = h > room ? innerHeight - gap - h : line + gap;
        // sous le cadre précédent (pas de chevauchement), sauf quand l'ancre s'en va : le cadre repart avec elle
        // et glisse sous le cadre « stack » (z-index plus élevé)
        const y = Math.max(a.top, Math.min(stuck, a.bottom - h), Math.min(prevBottom + gap, a.bottom - h));
        el.style.top = (y - boxTop) + "px";
        el.classList.toggle("is-stuck", y > a.top + 1);
        prevBottom = y + h;
        if (it.stack) line = y + h;
      }
    }
  }

  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  window.StickyFrame = { stick, follow, refresh: layout, headerBottom };
})();
