import time
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 1300, 'height': 900})
    ctx.add_init_script("localStorage.setItem('missionReportingConfig:v1', JSON.stringify({trigram:'ALF'}));localStorage.setItem('suiteLevel:v1','1');localStorage.setItem('repositoryLanguageMode','fr');")
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://127.0.0.1:8790/apps/settings/installation.html?m=sources'); time.sleep(5)
    print('dataRepo row:', pg.evaluate("() => { const tr = document.querySelector('tr[data-src=\"dataRepo\"]'); if (!tr) return 'absent'; const i = tr.querySelector('input'); return 'value=' + JSON.stringify(i.value) + ' type=' + i.type + ' disabled=' + i.disabled + ' title=' + i.title; }"))
    pg.goto('http://127.0.0.1:8790/apps/settings/profil.html?base=identity'); time.sleep(4)
    print('IVAO card visible at level 1:', pg.evaluate("!!document.querySelector('[data-ivc-card]')?.offsetParent"))
    print('errors', errs or 'none')
    b.close()
