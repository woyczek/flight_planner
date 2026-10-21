# Paysage : rail à gauche ; portrait : en-tête rangé en descendant, rendu en remontant
import time
from playwright.sync_api import sync_playwright
init = "localStorage.setItem('missionReportingConfig:v1', JSON.stringify({trigram:'ALF'}));localStorage.setItem('repositoryLanguageMode','fr');localStorage.setItem('repositoryMobileTheme','day');"
OUT = '/tmp/claude-0/-home-user/7b1db2ae-25b3-5fa5-91be-db447d44b0c4/scratchpad/mobile/'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    for skin in ['mobile', 'mobile-swiss']:
        ctx = b.new_context(viewport={'width': 667, 'height': 375}, is_mobile=True, has_touch=True); ctx.add_init_script(init + f"localStorage.setItem('repositoryMobileSkin','{skin}');")
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.goto('http://127.0.0.1:8790/apps/pilot/mes_vols.html'); time.sleep(4)
        print(skin, 'rail', pg.evaluate("JSON.stringify(document.querySelector('.repo-sidenav').getBoundingClientRect())"), 'padL', pg.evaluate("getComputedStyle(document.documentElement).paddingLeft"), 'scrollW', pg.evaluate("document.documentElement.scrollWidth"), errs or '')
        pg.screenshot(path=OUT + f'rail_{skin}.png'); ctx.close()
    ctx = b.new_context(viewport={'width': 375, 'height': 667}, is_mobile=True, has_touch=True); ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://127.0.0.1:8790/apps/planner/flight_performance_planner.html'); time.sleep(4)
    h = "() => { const e = document.querySelector('.repo-header'); return e.className.includes('away') + ' top ' + Math.round(e.getBoundingClientRect().bottom) + ' scrollY ' + Math.round(scrollY); }"
    print('start', pg.evaluate(h))
    for dy in (300, 300, -200, 400):
        pg.mouse.wheel(0, dy); time.sleep(.6); print('wheel', dy, pg.evaluate(h))
    print('errors', errs or 'none')
    b.close()
