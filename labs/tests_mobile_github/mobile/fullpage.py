# Capture pleine page au téléphone d'une page (argv[1]) + liste des blocs et éléments trop larges
import sys, threading, http.server, functools, time
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def guess_type(self, p): return 'text/javascript' if p.endswith('repository_tree') else super().guess_type(p)
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8777), functools.partial(Q, directory='/home/user/flight_planner'))
threading.Thread(target=srv.serve_forever, daemon=True).start()
init = open(sys.argv[3] if len(sys.argv) > 3 else 'init.js').read()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True); ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8777/' + sys.argv[1], wait_until='load'); time.sleep(4)
    print(pg.evaluate("""() => { const W = innerWidth; const out = [];
      for (const s of document.querySelectorAll('.repo-block')) { const r = s.getBoundingClientRect(); out.push('bloc ' + (s.dataset.blockId||'?') + ' h=' + Math.round(r.height) + (s.scrollWidth > s.clientWidth + 2 ? ' DEBORDE ' + s.scrollWidth : '') + (s.classList.contains('repo-block-hidden') ? ' (masqué)' : '')); }
      for (const el of document.querySelectorAll('main *')) { const r = el.getBoundingClientRect(); if (r.right > W + 2 && r.width > 40 && getComputedStyle(el).display !== 'none' && !el.closest('.maplibregl-map')) { out.push('large: ' + el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] + '#' + el.id + ' ' + Math.round(r.width)); if (out.length > 40) break; } }
      return out.join('\\n'); }"""))
    pg.screenshot(path=sys.argv[2], full_page=True)
    print('errors:', errs or 'none')
    b.close()
