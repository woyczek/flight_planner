import sys, threading, http.server, functools, time
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def guess_type(self, p): return 'text/javascript' if p.endswith('repository_tree') else super().guess_type(p)
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8778), functools.partial(Q, directory='/home/user/flight_planner'))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True); ctx.add_init_script(open('init.js').read())
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8778/apps/planner/flight_performance_planner.html', wait_until='load'); time.sleep(3)
    y0 = pg.evaluate('scrollY'); pg.locator('#calc').tap(); time.sleep(1.5)
    print('scroll avant/après:', y0, pg.evaluate('scrollY'), '| result top:', round(pg.locator('[data-block-id="result"]').bounding_box()['y']))
    b.close()
    print('errors:', errs or 'none')
