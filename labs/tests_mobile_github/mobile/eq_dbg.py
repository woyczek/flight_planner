import time
from playwright.sync_api import sync_playwright
init = "localStorage.setItem('missionReportingConfig:v1', JSON.stringify({trigram:'ALF'}));localStorage.setItem('repositoryLanguageMode','fr');"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True); ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8790/apps/settings/profil.html?base=equipment', wait_until='load'); time.sleep(5)
    print(pg.evaluate("document.querySelectorAll('.eq-more').length + ' ' + document.querySelectorAll('.eq-more summary').length"))
    pg.evaluate("window.__log = []; document.addEventListener('toggle', e => __log.push('toggle ' + e.target.open), true); addEventListener('scroll', e => __log.push('scroll ' + (e.target.className || e.target.nodeName)), true)")
    s = pg.locator('.eq-more summary').first; s.scroll_into_view_if_needed(); time.sleep(.5)
    pg.evaluate("__log = []")
    s.click(); time.sleep(.5)
    print(pg.evaluate("__log.join(' ; ') + ' | open ' + !!document.querySelector('.eq-more[open]')"))
    print('errors', errs)
    b.close()
