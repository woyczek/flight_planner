# Fiche appareil : onglets, sélecteur, enregistrement au changement ; en-tête rangé (titre gardé)
import time
from playwright.sync_api import sync_playwright
init = "localStorage.setItem('missionReportingConfig:v1', JSON.stringify({trigram:'ALF'}));localStorage.setItem('repositoryLanguageMode','fr');localStorage.setItem('repositoryMobileTheme','day');"
OUT = '/tmp/claude-0/-home-user/7b1db2ae-25b3-5fa5-91be-db447d44b0c4/scratchpad/mobile/'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True); ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://127.0.0.1:8790/apps/cr/appareil.html?reg=F-UHIB', wait_until='load'); time.sleep(5)
    print('active tab', pg.evaluate("document.querySelector('.repo-tab[aria-current]')?.textContent"), '| bar active', pg.evaluate("document.querySelector('.repo-sidenav-item[aria-current]')?.textContent.trim()"))
    pg.screenshot(path=OUT + 'fiche_haut.png')
    pg.fill('[data-sheet="notes"]', 'Essai note'); pg.locator('[data-sheet="commissioned"]').click(); time.sleep(.5)
    print('saved', pg.evaluate("document.querySelector('.sh-saved').textContent"), '| stored', pg.evaluate("JSON.stringify(JSON.parse(localStorage.getItem('missionAircraftSheets:v1')||'{}')['F-UHIB']?.notes)"))
    pg.mouse.wheel(0, 600); time.sleep(.8)
    print('header away', pg.evaluate("document.querySelector('.repo-header').className.includes('away')"), 'h1 bottom', pg.evaluate("Math.round(document.querySelector('header h1').getBoundingClientRect().bottom)"))
    pg.screenshot(path=OUT + 'fiche_scroll.png')
    pg.select_option('[data-goto]', index=0); time.sleep(4)
    print('after pick', pg.url, pg.evaluate("document.querySelector('header h1').textContent"))
    print('errors', errs or 'none')
    b.close()
