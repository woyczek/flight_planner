# Page Flotte sur téléphone (390×844, tactile) : premier écran, filtres ouverts, appui sur un terrain, tarmac, cartes.
import sys, threading, http.server, functools, time
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def guess_type(self, p): return 'text/javascript' if p.endswith('repository_tree') else super().guess_type(p)
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8772), functools.partial(Q, directory='/home/user/flight_planner'))
threading.Thread(target=srv.serve_forever, daemon=True).start()
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(open('init.js').read())
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8772/apps/cr/flotte.html', wait_until='load'); pg.wait_for_selector('.fm-ad', state='attached'); time.sleep(2)
    print('mobile:', pg.evaluate("document.documentElement.dataset.mobile"), pg.evaluate("document.documentElement.dataset.design"), '| hint:', pg.inner_text('[data-fm="hint"]'))
    pg.screenshot(path='m_fleet_1.png')
    pg.tap('[data-fm="ftoggle"]'); time.sleep(.3); pg.screenshot(path='m_fleet_filters.png')
    pg.select_option('select[data-ff="operator"]', 'Sécurité civile'); time.sleep(.5)
    print('toggle:', pg.inner_text('[data-fm="ftoggle"]'))
    pg.tap('[data-fm="ftoggle"]'); time.sleep(.3)
    pg.locator('.fm-map').scroll_into_view_if_needed(); time.sleep(.3)
    pg.locator('.fm-group, .fm-ad:not([style*="none"])').first.tap(); time.sleep(1.5)
    print('sheet:', pg.is_visible('.fm-tip.fm-sheet'), pg.inner_text('.fm-tip')[:120].replace('\n', ' | '))
    pg.screenshot(path='m_fleet_tap.png')
    pg.locator('.fm-map').scroll_into_view_if_needed(); time.sleep(.3)
    chips = pg.locator('.fm-chip'); vis = [i for i in range(chips.count()) if (lambda bb: bb and 0 < bb['y'] < 800 and 0 < bb['x'] < 380)(chips.nth(i).bounding_box())]
    print('visible chips:', len(vis)); chips.nth(vis[0]).tap(); time.sleep(.6)
    print('chip sheet:', pg.inner_text('.fm-tip')[:100].replace('\n', ' | '))
    pg.screenshot(path='m_fleet_tarmac.png')
    pg.tap('.fm-sheet-close'); time.sleep(.3); print('sheet closed:', not pg.is_visible('.fm-tip'))
    pg.locator('.fp-table').scroll_into_view_if_needed(); time.sleep(.3)
    pg.screenshot(path='m_fleet_cards.png')
    pg.tap('.fp-table tbody tr[data-key] td:nth-child(2)'); time.sleep(1.2)
    print('after card tap: sel rows', pg.locator('tr.fp-sel').count(), '| map top', round(pg.locator('[data-fp="map"]').bounding_box()['y']))
    b.close()
print('errors:', errs or 'none')
