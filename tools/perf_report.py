"""Rapport de performance : docs/technique/perf/RAPPORT_PERF.md et ses graphes (docs/technique/perf/img/*.svg), d'après les mesures de
docs/technique/perf/runs/ (tools/perf_audit.html : parcours de clics ; tools/perf_scale.html : montée en charge).

Usage (à la racine du dépôt) :
    python tools/perf_report.py                      → compare les deux mesures les plus récentes de chaque sorte
    python tools/perf_report.py avant après          → compare les mesures dont le libellé est « avant » et « après »
"""
import glob
import io
import json
import math
import os
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
RUNS = os.path.join(ROOT, 'docs', 'technique', 'perf', 'runs')
IMG = os.path.join(ROOT, 'docs', 'technique', 'perf', 'img')
OUT = os.path.join(ROOT, 'docs', 'technique', 'perf', 'RAPPORT_PERF.md')
C_BEFORE, C_AFTER, INK, MUT, LINE = '#d8763b', '#3b6fd8', '#1b1f24', '#5b6470', '#d5d9df'
KEYS = [('settleMs', 'temps jusqu’à page stable (ms)'), ('longtask.ms', 'temps de blocage (tâches longues, ms)'), ('blocked.ms', 'retard de minuterie > 50 ms (ms)'), ('fetch', 'requêtes'),
        ('fetch.404', 'requêtes en 404'), ('idb.open', 'ouvertures IndexedDB'), ('json.parse', 'analyses JSON'),
        ('storage.get', 'lectures du stockage'), ('fs.getFile', 'fichiers lus (dossier)'), ('fs.list', 'listes de dossier'),
        ('i18n.n', 'passes de traduction'), ('i18n.ms', 'traduction (ms)'), ('icons.ms', 'icônes des blocs (ms)'),
        ('deco.ms', 'décors (ms)'), ('mo.calls', 'rappels d’observateurs'), ('mo.ms', 'observateurs (ms)'),
        ('storage.set', 'écritures du stockage'), ('fs.write', 'fichiers écrits (dossier)')]


def esc(s):
    return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def load_runs():
    audits, scales = [], []
    for p in sorted(glob.glob(os.path.join(RUNS, '*.json'))):
        data = json.load(io.open(p, encoding='utf-8'))
        if isinstance(data, list):
            for r in data:
                r['_file'] = os.path.basename(p)
                audits.append(r)
        elif isinstance(data, dict) and 'results' in data:
            data['_file'] = os.path.basename(p)
            scales.append(data)
    return audits, scales


def val(step, key):
    if key in ('settleMs', 'nodes'):
        return step.get(key) or 0
    return (step.get('counters') or {}).get(key, 0) or 0


def median(v):
    v = sorted(v)
    n = len(v)
    return (v[n // 2] if n % 2 else (v[n // 2 - 1] + v[n // 2]) / 2) if n else 0


def pick(runs, label, mode=None):
    """Mesure du libellé (et du mode) ; plusieurs passages du même libellé : médiane de chaque compteur, étape par
    étape (le bruit de la machine, ±30 %, l'emporte sinon sur les écarts réels)."""
    c = [r for r in runs if (label is None or (r.get('label') or '') == label) and (mode is None or r.get('mode') == mode)]
    if len(c) < 2 or label is None:
        return c[-1] if c else None
    out = dict(c[-1], runs=len(c), steps=[])
    for i, s in enumerate(c[-1]['steps']):
        same = [r['steps'][i] for r in c if len(r['steps']) > i and r['steps'][i]['step'] == s['step'] and r['steps'][i]['page'] == s['page']]
        keys = {k for x in same for k in (x.get('counters') or {})}
        out['steps'].append(dict(s, settleMs=median([x['settleMs'] for x in same]),
                                 counters={k: median([(x.get('counters') or {}).get(k, 0) for x in same]) for k in keys}))
    return out


# ---------------------------------------------------------------- graphes SVG
def svg_steps(a, b, title):
    key = lambda s: f"{s['page'].split('/')[-1].replace('.html', '')} · {s['step']}"
    bm = {key(s): s for s in b['steps']}
    rows = [(key(s), s, bm[key(s)]) for s in a['steps'] if key(s) in bm]
    mx = max([1] + [max(r[1]['settleMs'], r[2]['settleMs']) for r in rows])
    w, left, h = 520, 300, 22
    H = 44 + len(rows) * h
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{left + w + 150}" height="{H}" font-family="system-ui,Segoe UI,sans-serif" font-size="11">',
           f'<rect width="100%" height="100%" fill="#fff"/><text x="0" y="14" font-size="13" font-weight="600" fill="{INK}">{esc(title)}</text>',
           f'<rect x="{left}" y="22" width="10" height="8" fill="{C_BEFORE}"/><text x="{left + 14}" y="30" fill="{MUT}">avant</text>',
           f'<rect x="{left + 60}" y="22" width="10" height="8" fill="{C_AFTER}"/><text x="{left + 74}" y="30" fill="{MUT}">après</text>']
    for i, (k, s0, s1) in enumerate(rows):
        y = 40 + i * h
        a0, a1 = s0['settleMs'] / mx * w, s1['settleMs'] / mx * w
        out.append(f'<text x="0" y="{y + 12}" fill="{INK}">{esc(k[:48])}</text>')
        out.append(f'<rect x="{left}" y="{y}" width="{a0:.1f}" height="8" fill="{C_BEFORE}"/><rect x="{left}" y="{y + 9}" width="{a1:.1f}" height="8" fill="{C_AFTER}"/>')
        out.append(f'<text x="{left + max(a0, a1) + 6:.1f}" y="{y + 13}" fill="{MUT}">{s0["settleMs"]} → {s1["settleMs"]} ms</text>')
    out.append('</svg>')
    return '\n'.join(out)


def totals(a, b):
    key = lambda s: (s['page'], s['step'])
    bm = {key(s): s for s in b['steps']}
    rows = [(s, bm[key(s)]) for s in a['steps'] if key(s) in bm]
    return [(k, label, sum(val(x, k) for x, _ in rows), sum(val(y, k) for _, y in rows)) for k, label in KEYS]


def svg_totals(tot, title):
    rows = [t for t in tot if t[2] or t[3]]
    left, w, h = 230, 380, 24
    H = 40 + len(rows) * h
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{left + w + 190}" height="{H}" font-family="system-ui,Segoe UI,sans-serif" font-size="11">',
           f'<rect width="100%" height="100%" fill="#fff"/><text x="0" y="14" font-size="13" font-weight="600" fill="{INK}">{esc(title)}</text>']
    for i, (k, label, x, y) in enumerate(rows):
        top = 28 + i * h
        mx = max(x, y, 1)
        d = (y - x) / x * 100 if x else 0
        col = '#1d7a3a' if d < -5 else '#a3241a' if d > 5 else MUT
        out.append(f'<text x="0" y="{top + 12}" fill="{INK}">{esc(label)}</text>')
        out.append(f'<rect x="{left}" y="{top}" width="{x / mx * w:.1f}" height="8" fill="{C_BEFORE}"/><rect x="{left}" y="{top + 9}" width="{y / mx * w:.1f}" height="8" fill="{C_AFTER}"/>')
        out.append(f'<text x="{left + w + 8}" y="{top + 13}" fill="{col}">{round(x)} → {round(y)} ({"+" if d > 0 else ""}{round(d)} %)</text>')
    out.append('</svg>')
    return '\n'.join(out)


def svg_delta(tot, title):
    """Gains et pertes : écart en % de chaque indicateur (barre vers la gauche : gain ; vers la droite : perte), borné à ±100 %."""
    rows = [(label, (y - x) / x * 100) for k, label, x, y in tot if x]
    left, half, h = 250, 150, 22
    mid = left + half
    H = 46 + len(rows) * h
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{mid + half + 70}" height="{H}" font-family="system-ui,Segoe UI,sans-serif" font-size="12">',
           f'<rect width="100%" height="100%" fill="#fff"/><text x="0" y="14" font-size="13" font-weight="600" fill="{INK}">{esc(title)}</text>',
           f'<text x="{mid - 6}" y="32" text-anchor="end" fill="{MUT}">← gain</text><text x="{mid + 6}" y="32" fill="{MUT}">perte →</text>',
           f'<line x1="{mid}" y1="38" x2="{mid}" y2="{H - 4}" stroke="{LINE}"/>']
    for i, (label, d) in enumerate(rows):
        y = 42 + i * h
        w = min(abs(d), 100) / 100 * half
        col = '#1d7a3a' if d < -5 else '#a3241a' if d > 5 else MUT
        x0 = mid - w if d < 0 else mid
        out.append(f'<text x="0" y="{y + 12}" fill="{INK}">{esc(label)}</text>')
        out.append(f'<rect x="{x0:.1f}" y="{y + 2}" width="{max(w, 1):.1f}" height="12" fill="{col}"/>')
        tx, anchor = (mid - w - 5, 'end') if d < 0 else (mid + w + 5, 'start')
        out.append(f'<text x="{tx:.1f}" y="{y + 12}" text-anchor="{anchor}" fill="{col}">{"+" if d > 0 else ""}{round(d)} %</text>')
    out.append('</svg>')
    return '\n'.join(out)


def svg_scale(case_a, case_b, title):
    """Log-log : mesures (points), ajustement prolongé jusqu'aux cibles (pointillés), avant / après."""
    pts = [p for c in (case_a, case_b) if c for p in c['points'] if p[1]] + [e for c in (case_a, case_b) if c for e in (c.get('extrapolation') or [])]
    if not pts:
        return ''
    xs = [p[0] for p in pts]
    ys = [max(p[1], 0.01) for p in pts]
    x0, x1 = math.log10(min(xs)), math.log10(max(xs))
    y0, y1 = math.log10(min(ys)), math.log10(max(ys))
    W, H, L, B = 460, 230, 52, 34
    X = lambda v: L + (math.log10(v) - x0) / ((x1 - x0) or 1) * (W - L - 12)
    Y = lambda v: H - B - (math.log10(max(v, 0.01)) - y0) / ((y1 - y0) or 1) * (H - B - 26)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" font-family="system-ui,Segoe UI,sans-serif" font-size="10">',
           f'<rect width="100%" height="100%" fill="#fff"/><text x="0" y="13" font-size="12" font-weight="600" fill="{INK}">{esc(title[:70])}</text>',
           f'<line x1="{L}" y1="{H - B}" x2="{W - 8}" y2="{H - B}" stroke="{LINE}"/><line x1="{L}" y1="22" x2="{L}" y2="{H - B}" stroke="{LINE}"/>']
    for e in range(math.floor(y0), math.ceil(y1) + 1):
        v = 10 ** e
        if 22 <= Y(v) <= H - B:  # graduations dans le cadre seulement
            out.append(f'<text x="{L - 4}" y="{Y(v) + 3:.1f}" text-anchor="end" fill="{MUT}">{v:g} ms</text><line x1="{L}" y1="{Y(v):.1f}" x2="{W - 8}" y2="{Y(v):.1f}" stroke="#eef0f3"/>')
    px = -99
    for v in sorted(set(xs)):  # graduations assez espacées pour rester lisibles
        if X(v) - px >= 34:
            out.append(f'<text x="{X(v):.1f}" y="{H - B + 14}" text-anchor="middle" fill="{MUT}">{v:g}</text>')
            px = X(v)
    for c, col in ((case_a, C_BEFORE), (case_b, C_AFTER)):
        if not c:
            continue
        p = [q for q in c['points'] if q[1]]
        if len(p) > 1:
            out.append('<polyline fill="none" stroke="%s" stroke-width="2" points="%s"/>' % (col, ' '.join(f'{X(q[0]):.1f},{Y(q[1]):.1f}' for q in p)))
        for q in p:
            out.append(f'<circle cx="{X(q[0]):.1f}" cy="{Y(q[1]):.1f}" r="3" fill="{col}"/>')
        ext = [e for e in (c.get('extrapolation') or []) if p and e[0] > p[-1][0]]  # au-delà de la dernière mesure
        if p and ext:
            out.append('<polyline fill="none" stroke="%s" stroke-width="1.5" stroke-dasharray="4 3" points="%s"/>' % (col, ' '.join(f'{X(q[0]):.1f},{Y(q[1]):.1f}' for q in [p[-1]] + ext)))
    out.append(f'<text x="{W - 8}" y="{H - 6}" text-anchor="end" fill="{MUT}">{esc(case_a["unit"] if case_a else case_b["unit"])} (échelle log) — pointillés : extrapolation</text>')
    out.append('</svg>')
    return '\n'.join(out)


def write(name, svg):
    os.makedirs(IMG, exist_ok=True)
    io.open(os.path.join(IMG, name), 'w', encoding='utf-8', newline='\n').write(svg)
    return f'img/{name}'


def main():
    la, lb = (sys.argv[1], sys.argv[2]) if len(sys.argv) > 2 else (None, None)
    audits, scales = load_runs()
    md = ['# Rapport de performance', '', 'Généré par `python tools/perf_report.py` d’après `docs/technique/perf/runs/` (méthode et plan d’action :',
          '[PLAN_PERF_2026-10-04.md](PLAN_PERF_2026-10-04.md)). Barres orange : avant ; bleues : après.', '']
    syn = os.path.join(ROOT, 'docs', 'technique', 'perf', 'SYNTHESE.md')  # lecture des résultats, écrite à la main après l'audit
    if os.path.exists(syn):
        md += [io.open(syn, encoding='utf-8').read().rstrip(), '']
    for mode in ('serveur', 'sans serveur'):
        modes = [r for r in audits if r.get('mode') == mode]
        a = pick(modes, la) if la else (modes[-2] if len(modes) > 1 else None)
        b = pick(modes, lb) if lb else (modes[-1] if modes else None)
        if not a or not b:
            continue
        slug = mode.replace(' ', '_')
        md += [f'## Parcours de clics — {mode}', '',
               f'Avant : « {a.get("label")} » ({(a.get("build") or {}).get("sha", "")[:8]}, {a.get("runs", 1)} passage(s)) — '
               f'après : « {b.get("label")} » ({(b.get("build") or {}).get("sha", "")[:8]}, {b.get("runs", 1)} passage(s)). '
               'Plusieurs passages : médiane par étape.', '']
        md += [f'![Gains et pertes — {mode}]({write(f"ecarts_{slug}.svg", svg_delta(totals(a, b), f"Gains et pertes du parcours — {mode}"))})', '']
        md += ['| indicateur (total du parcours) | avant | après | écart |', '|---|---:|---:|---:|']
        for k, label, x, y in totals(a, b):
            if x or y:
                md.append(f'| {label} | {round(x)} | {round(y)} | {("+" if y > x else "") + str(round((y - x) / x * 100)) + " %" if x else "—"} |')
        md += ['', f'![Temps par étape — {mode}]({write(f"etapes_{slug}.svg", svg_steps(a, b, f"Temps jusqu’à page stable, par étape — {mode}"))})', '',
               '« Temps jusqu’à page stable » inclut les délais voulus (animations, regroupements) : les compteurs ci-dessus mesurent',
               'le travail réellement fait.', '']
    last = lambda lab: next((r for r in reversed(scales) if r.get('label') == lab), None)
    sa = last(la or 'avant') or (scales[-2] if len(scales) > 1 else None)
    sb = last(lb or 'après') or (scales[-1] if scales else None)
    if sa or sb:
        md += ['## Montée en charge', '', 'Données fictives de taille croissante, vraies fonctions de la suite ; ajustement `t = a·n^b` et extrapolation.', '']
        ids = [r['id'] for r in (sa or sb)['results']]
        sizes = []
        md += ['| cas | b avant | b après | ' + ' | '.join(['extrapolé avant', 'extrapolé après']) + ' |', '|---|---:|---:|---|---|']
        for cid in ids:
            ca = next((r for r in (sa or {}).get('results', []) if r['id'] == cid), None)
            cb = next((r for r in (sb or {}).get('results', []) if r['id'] == cid), None)
            ref = ca or cb
            fmt = lambda c: ', '.join(f'{e[0]:g} → {e[1]:g} ms' for e in (c.get('extrapolation') or [])) if c else '—'
            fb = lambda c: f"{c['fit']['b']:.2f}" if c and c.get('fit') else '—'
            md.append(f'| {ref["label"]} | {fb(ca)} | {fb(cb)} | {fmt(ca)} | {fmt(cb)} |')
            for c, when in ((ca, 'avant'), (cb, 'après')):
                if c and c.get('extra'):
                    sizes.append(f'- {ref["label"]} ({when}) : ' + ', '.join(f'{k} → {v}' for k, v in c['extra'].items()))
        md.append('')
        if sizes:
            md += ['Volumes mesurés :', ''] + sizes + ['']
        for cid in ids:
            ca = next((r for r in (sa or {}).get('results', []) if r['id'] == cid), None)
            cb = next((r for r in (sb or {}).get('results', []) if r['id'] == cid), None)
            md += [f'![{(ca or cb)["label"]}]({write(f"charge_{cid}.svg", svg_scale(ca, cb, (ca or cb)["label"]))})', '']
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write('\n'.join(md) + '\n')
    print(OUT)


if __name__ == '__main__':
    main()
