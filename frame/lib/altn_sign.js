// Le signe d'un terrain de dégagement proposé : la pastille (un anneau et un signe : ✓ ! ? ✕), UNE table pour toute la suite (SOG-0702, l'ergonome et le relais, 28 novembre 2026).
// La Carte la peint en canvas pour ses terrains et en SVG pour sa légende, Carburant en SVG pour la liste des dégagements : plus deux dessins qui divergent.
// Ni page, ni texte, ni état : un dessin et ses couleurs.
//
//   ALTN_SIGNS            : { ok, warn, grey, err } → { glyph: chemin SVG centré en (0, 0), dots: [[cx, cy, r]], color: { day, night } } ; l'anneau est le même pour tous (RING_R, RING_W).
//                           ok ✓ vert, warn ! orange, grey ? gris (non jugé), err ✕ rouge (les couleurs de Q-0075 : vert VFR ou MVFR, orange IFR, rouge LIFR, gris pas de TAF).
//   altnSignColor(sign, dark) → la couleur du signe (jour ou nuit) ; celle de ok pour un signe inconnu.
//   altnSignSvg(sign, dark, { width, height, cls }) → le SVG de la pastille (aria-hidden, class `cls`, « al-sw » par défaut), 22 × 22 par défaut ; le fond de l'anneau est transparent.
//   drawAltnSign(ctx, x, y, sign, { dark, bg }) → la pastille en canvas, centrée en (x, y) : l'anneau (rempli de bg), le signe tracé (jamais une police) ; rend la couleur.
export const RING_R = 9,
  RING_W = 3,
  GLYPH_W = 2.2;
export const ALTN_SIGNS = {
  ok: {
    glyph: 'M-4 .5 L-1.2 3.4 L4.2 -3.4',
    dots: [],
    color: {
      day: '#2e7d32',
      night: '#69d28a'
    }
  },
  warn: {
    glyph: 'M0 -4.6 L0 .8',
    dots: [
      [0, 3.9, 1.4]
    ],
    color: {
      day: '#e65100',
      night: '#ffb74d'
    }
  },
  grey: {
    glyph: 'M-2.7 -2.4 A2.7 2.7 0 1 1 0 .3 L0 1.6',
    dots: [
      [0, 4.4, 1.3]
    ],
    color: {
      day: '#5f6b7a',
      night: '#9aa7b6'
    }
  },
  err: {
    glyph: 'M-3.6 -3.6 L3.6 3.6 M3.6 -3.6 L-3.6 3.6',
    dots: [],
    color: {
      day: '#c62828',
      night: '#ff8a80'
    }
  }
};
const of = sign => ALTN_SIGNS[Object.hasOwn(ALTN_SIGNS, sign) ? sign : 'ok'];
export const altnSignColor = (sign, dark) => of(sign).color[dark ? 'night' : 'day'];
export function altnSignSvg(sign, dark, {
  width = 22,
  height = 22,
  cls = 'al-sw'
} = {}) {
  const s = of(sign),
    c = altnSignColor(sign, dark),
    h = 22,
    w = h * width / height; // la pastille garde sa taille, centrée dans le cadre demandé
  return `<svg class="${cls}" width="${width}" height="${height}" viewBox="${-w / 2} ${-h / 2} ${w} ${h}" aria-hidden="true"><circle cx="0" cy="0" r="${RING_R}" fill="none" stroke="${c}" stroke-width="${RING_W}"/>` +
    `<path d="${s.glyph}" fill="none" stroke="${c}" stroke-width="${GLYPH_W}" stroke-linecap="round" stroke-linejoin="round"/>` +
    s.dots.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join('') + '</svg>';
}
export function drawAltnSign(ctx, x, y, sign, {
  dark = false,
  bg = '#fff'
} = {}) {
  const s = of(sign),
    c = altnSignColor(sign, dark);
  ctx.beginPath();
  ctx.arc(x, y, RING_R, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = RING_W;
  ctx.strokeStyle = c;
  ctx.stroke();
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = c;
  ctx.fillStyle = c;
  ctx.lineWidth = GLYPH_W;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(new Path2D(s.glyph));
  for (const [dx, dy, r] of s.dots) {
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return c;
}
