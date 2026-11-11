# Site construit (comme sur Pages, sans lanceur) : avant réglage (exemples), réglage du jeton, puis pages de la phase 1
import sys
sys.path.insert(0, '.')
import mockgh
from playwright.sync_api import sync_playwright
B = 'http://127.0.0.1:8791/flight_planner/'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    ctx.add_init_script("localStorage.setItem('missionReportingConfig:v1', JSON.stringify({trigram:'RBR'}));localStorage.setItem('repositoryLanguageMode','fr');")
    ctx.route('https://api.github.com/**', mockgh.handler)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(pg.url.split('/')[-1] + ': ' + str(e)[:160]))
    pg.goto(B + 'apps/cr/flotte.html'); pg.wait_for_timeout(4000)
    print('sans réglage: flotte', pg.evaluate("(window.DEFA_FLEET||[]).length"), '| mobile', pg.evaluate("document.documentElement.dataset.mobile"), '| manifest', pg.evaluate("!!document.querySelector('link[rel=manifest]')"))
    pg.goto(B + 'apps/settings/profil.html?base=dataAccess'); pg.wait_for_timeout(3000)
    pg.fill('[data-gh=repo]', 'Woyczek/flight_planner_data'); pg.fill('[data-gh=token]', 'TESTTOKEN')
    pg.get_by_role('button', name='Enregistrer').first.click(); pg.wait_for_timeout(6000)
    print('réglé: url', pg.url.split('/')[-1], '| on', pg.evaluate("!!localStorage.getItem('githubData:v1')"))
    for u, js in [('apps/cr/flotte.html', "(window.DEFA_FLEET||[]).length + ' appareils, carte ' + !!document.querySelector('.fm-map')"),
                  ('apps/pilot/aujourdhui.html', "document.querySelector('main')?.innerText.slice(0, 160).replace(/\\n+/g, ' | ')"),
                  ('apps/pilot/mes_vols.html', "document.querySelectorAll('.mv-table tbody tr').length + ' vols'"),
                  ('apps/pilot/disponibilites.html', "document.querySelectorAll('.dw-dlist li').length + ' plages ce jour'"),
                  ('apps/cr/HEMS/hems_medevac_cr.html', "MissionLedger.store.missions.length + ' CR au registre'"),
                  ('apps/planner/flight_performance_planner.html', "document.title"),
                  ('apps/cr/appareil.html?reg=F-UHIB', "document.querySelector('header h1')?.textContent + ' | AIRCRAFT_DB ' + Object.keys(window.AIRCRAFT_DB||{}).length"),
                  ('index.html', "document.getElementById('setup')?.hidden + ' ' + (document.getElementById('setup')?.textContent||'').slice(0,40) + ' | noData ' + document.getElementById('noData').style.display"),
                  ('apps/settings/installation.html?m=sources', "document.querySelector('tr[data-src=dataRepo] input')?.value + ' | ' + document.querySelector('tr[data-src=dataRepo] .mt-small')?.textContent.slice(0,60)")]:
        pg.goto(B + u); pg.wait_for_timeout(5000)
        print(u.split('/')[-1][:30], '→', pg.evaluate(js))
    print('errors:', errs or 'none')
    print('api:', len(mockgh.LOG), 'requêtes ; 404 du site :', open('/tmp/claude-0/-home-user/7b1db2ae-25b3-5fa5-91be-db447d44b0c4/scratchpad/www.log').read().count(' 404 '))
    b.close()
