import threading, http.server, functools, time
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def guess_type(self, p): return 'text/javascript' if p.endswith('repository_tree') else super().guess_type(p)
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8775), functools.partial(Q, directory='/home/user/flight_planner'))
threading.Thread(target=srv.serve_forever, daemon=True).start()
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 1300, 'height': 1000}); ctx.add_init_script(open('init.js').read())
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8775/apps/settings/apparence.html', wait_until='load'); time.sleep(3)
    print(pg.inner_text('[data-block-id="ap-mobile"]').replace('\n', ' | ')[:500])
    print('thumbs with mobile skins:', pg.locator('.ap-thumb[data-design^="mobile"]').count())
    pg.click('[data-mobile-skin="mobile-swiss"]'); time.sleep(.3); pg.click('[data-mobile-theme="night"]'); time.sleep(.3)
    print('stored:', pg.evaluate("[localStorage.repositoryMobileSkin, localStorage.repositoryMobileTheme, document.documentElement.dataset.mobileTheme]"))
    pg.click('[data-mobile-mode="on"]'); time.sleep(.5)
    print('mode on:', pg.evaluate("[document.documentElement.dataset.mobile, localStorage.repositoryMobile]"))
    pg.locator('[data-block-id="ap-mobile"]').screenshot(path='ap_mobile.png')
    pg.click('[data-mobile-mode="auto"]'); time.sleep(.5)
    print('mode auto:', pg.evaluate("document.documentElement.dataset.mobile"))
    # téléphone : le skin choisi s'applique
    ph = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True); ph.add_init_script(open('init.js').read() + "localStorage.setItem('repositoryMobileSkin','mobile-swiss');localStorage.setItem('repositoryMobileTheme','night');")
    q = ph.new_page(); q.on('pageerror', lambda e: errs.append(str(e))); q.goto('http://127.0.0.1:8775/apps/settings/apparence.html', wait_until='load'); time.sleep(3)
    print('phone:', q.evaluate("[document.documentElement.dataset.design, document.documentElement.dataset.mobileTheme, getComputedStyle(document.body).backgroundColor]"))
    q.screenshot(path='ap_phone.png')
    b.close()
print('errors:', errs or 'none')
