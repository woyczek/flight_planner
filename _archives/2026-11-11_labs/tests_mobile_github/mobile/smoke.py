# Pages touchées : chargées sans erreur JavaScript, téléphone et ordinateur ; paysage téléphone en mode mobile
import time
from playwright.sync_api import sync_playwright
init = "localStorage.setItem('missionReportingConfig:v1', JSON.stringify({trigram:'ALF'}));"
PAGES = ['apps/cr/appareil.html?reg=F-UHIB', 'apps/cr/equipage.html?name=ALF', 'apps/cr/mission_operations_reporting.html', 'apps/settings/profil.html?base=equipment', 'apps/settings/apparence.html', 'apps/planner/flight_performance_planner.html', 'apps/planner/performance_sheets.html', 'apps/pilot/disponibilites.html', 'apps/pilot/mes_missions.html', 'apps/cr/flotte.html', 'tools/mobile_preview.html']
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    for name, vp, mob in [('phone', (390, 844), True), ('landscape', (844, 390), True), ('desktop', (1400, 900), False)]:
        ctx = b.new_context(viewport={'width': vp[0], 'height': vp[1]}, is_mobile=mob, has_touch=mob); ctx.add_init_script(init)
        for u in PAGES if name != 'landscape' else PAGES:
            pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:150]))
            pg.goto('http://127.0.0.1:'+__import__('os').environ.get('PORT','8790')+'/' + u, wait_until='load'); time.sleep(3.5)
            print(name, u.split('/')[-1][:40], 'mobile=' + str(pg.evaluate("document.documentElement.dataset.mobile")), 'scrollW', pg.evaluate("document.documentElement.scrollWidth"), errs or 'ok')
            pg.close()
        ctx.close()
    b.close()
