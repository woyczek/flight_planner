# Audit mobile : chaque page à 390×844 (tactile), débordement horizontal, éléments trop larges, capture du premier écran.
import sys, json, threading, http.server, functools, time
from playwright.sync_api import sync_playwright
ROOT = '/home/user/flight_planner'; OUT = sys.argv[1]; TAG = sys.argv[2] if len(sys.argv) > 2 else 'avant'
PAGES = sys.argv[3].split(',') if len(sys.argv) > 3 else [
  'apps/pilot/aujourdhui.html', 'apps/pilot/mes_missions.html', 'apps/pilot/disponibilites.html', 'apps/pilot/mes_vols.html',
  'apps/cr/mission_cr.html', 'apps/cr/flotte.html', 'apps/cr/appareil.html?reg=F-ZBEG', 'apps/cr/mission_operations_reporting.html',
  'apps/planner/flight_performance_planner.html', 'apps/planner/map_planner.html', 'apps/landing/LandingPerformance_Dashboard_MultiCSV_i18n.html',
  'apps/settings/profil.html', 'index.html']
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def guess_type(self, p): return 'text/javascript' if p.endswith('repository_tree') else super().guess_type(p)
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8770), functools.partial(Q, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
sys.path.insert(0, '/tmp/claude-0/-home-user/7b1db2ae-25b3-5fa5-91be-db447d44b0c4/scratchpad/test')
init = open('/tmp/claude-0/-home-user/7b1db2ae-25b3-5fa5-91be-db447d44b0c4/scratchpad/mobile/init_vols.js').read()
MEASURE = """() => {
  const W = innerWidth, wide = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width > W + 2 && getComputedStyle(el).display !== 'none' && !el.closest('.maplibregl-canvas-container')) wide.push([r.width, el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '')]);
  }
  wide.sort((a, b) => b[0] - a[0]);
  const seen = new Set(), top = wide.filter(w => !seen.has(w[1]) && seen.add(w[1])).slice(0, 6).map(w => Math.round(w[0]) + ' ' + w[1]);
  const small = [...document.querySelectorAll('button,a,input,select')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && r.height < 32 && getComputedStyle(e).visibility !== 'hidden'; }).length;
  const all = [...document.querySelectorAll('button,a,input,select')].filter(e => e.getBoundingClientRect().width).length;
  return { scrollW: document.documentElement.scrollWidth, W, height: document.documentElement.scrollHeight, top, small, all,
    sidenav: !!document.querySelector('.repo-sidenav') && getComputedStyle(document.querySelector('.repo-sidenav')).display !== 'none',
    font: getComputedStyle(document.body).fontSize };
}"""
res = {}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, color_scheme=('dark' if TAG.startswith('nuit') else 'light'))
    ctx.add_init_script(init)
    for u in PAGES:
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:120]))
        try:
            pg.goto('http://127.0.0.1:8770/' + u, wait_until='load', timeout=45000)
        except Exception as e:
            errs.append('goto ' + str(e)[:80])
        time.sleep(3)
        m = pg.evaluate(MEASURE); m['errors'] = errs
        name = u.split('/')[-1].split('.')[0].split('?')[0]
        pg.screenshot(path=f'{OUT}/{TAG}_{name}.png')
        res[u] = m
        print(f"{u}: scrollW={m['scrollW']} (W {m['W']}) h={m['height']} sidenav={m['sidenav']} petits={m['small']}/{m['all']} err={len(errs)}")
        for w in m['top']: print('    ', w)
        pg.close()
    b.close()
json.dump(res, open(f'{OUT}/{TAG}.json', 'w'), indent=1)
