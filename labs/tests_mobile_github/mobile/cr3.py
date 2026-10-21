import sys, time
from playwright.sync_api import sync_playwright
BASE = 'http://127.0.0.1:8790/'
init = "localStorage.setItem('missionReportingConfig:v1', JSON.stringify({trigram:'ALF'}));localStorage.setItem('repositoryLanguageMode','fr');localStorage.setItem('repositoryMobileSkin', '" + (sys.argv[1] if len(sys.argv)>1 else 'mobile') + "');localStorage.setItem('repositoryMobileTheme', '" + (sys.argv[2] if len(sys.argv)>2 else 'day') + "');"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True); ctx.add_init_script(init)
    pg = ctx.new_page()
    pg.goto(BASE + 'apps/pilot/mes_missions.html', wait_until='load'); time.sleep(4)
    pg.get_by_text('A-001A').first.tap(); time.sleep(2)
    pg.get_by_text('Ouvrir la mission').first.tap(); time.sleep(3)
    pg.locator('[data-go="cr"]').first.tap(); time.sleep(6)
    print(len(ctx.pages), [x.url for x in ctx.pages], [f.url for f in pg.frames])
    print(pg.evaluate("""() => { const e = document.elementFromPoint(200, 25); return e.tagName + '.' + e.className + ' | ' + (e.closest('header')?.className||'') + ' | iframes ' + document.querySelectorAll('iframe').length + ' | ' + location.href + ' | ' + document.title; }"""))
    pg.evaluate("scrollTo(0, 1500)"); time.sleep(1)
    print(pg.evaluate('''() => { const e = document.elementFromPoint(200, 25); const st=document.querySelector('[data-action=store]'); return e.tagName + '.' + e.className + ' | ' + (e.closest('header')?.className||'') + ' scrollY ' + scrollY + ' | store text ' + st.textContent + ' ' + JSON.stringify(st.getBoundingClientRect()) + ' pos ' + getComputedStyle(st).position + ' bg ' + getComputedStyle(st).backgroundColor + ' nav-on ' + getComputedStyle(document.querySelector('.mc-steps-nav button.on')).backgroundColor + ' vis ' + getComputedStyle(st).visibility + ' disp ' + getComputedStyle(st).display; }'''))
    pg.screenshot(path='cr3_%s_%s.png' % (sys.argv[1], sys.argv[2]))
    b.close()
