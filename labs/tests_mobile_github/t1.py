# Mode GitHub de bout en bout (faux GitHub) : réglage dans Mon profil, service worker, lectures (Flotte, dispos, missions), écriture d'une dispo
import sys, time, json
sys.path.insert(0, '.')
import mockgh
from playwright.sync_api import sync_playwright
B = 'http://127.0.0.1:8790/'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    ctx.add_init_script("localStorage.setItem('missionReportingConfig:v1', JSON.stringify({trigram:'RBR'}));localStorage.setItem('repositoryLanguageMode','fr');")
    ctx.route('https://api.github.com/**', mockgh.handler)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(B + 'apps/settings/profil.html?base=dataAccess'); pg.wait_for_timeout(int(4*1000))
    print('panel:', pg.evaluate("document.querySelector('[data-gh=repo]') ? 'ok' : 'absent'"))
    pg.fill('[data-gh=repo]', 'Woyczek/flight_planner_data'); pg.fill('[data-gh=token]', 'TESTTOKEN')
    pg.get_by_role('button', name='Enregistrer').first.click(); pg.wait_for_timeout(int(5*1000))
    print('after save: on=', pg.evaluate("!!localStorage.getItem('githubData:v1')"), 'url=', pg.url.split('/')[-1], 'state=', pg.evaluate("document.querySelector('[data-gh-state]')?.textContent"))
    pg.goto(B + 'apps/cr/flotte.html'); pg.wait_for_timeout(int(5*1000))
    print('flotte rows:', pg.evaluate("document.querySelectorAll('.fp-table tbody tr[data-key]').length"), '| DEFA_FLEET', pg.evaluate("(window.DEFA_FLEET||[]).length"), '| DATA_TREE repo', pg.evaluate("window.DATA_TREE?.repository"))
    pg.goto(B + 'apps/pilot/disponibilites.html'); pg.wait_for_timeout(int(6*1000))
    print('dispos: day list', pg.evaluate("[...document.querySelectorAll('.dw-dlist li span')].map(x=>x.textContent).join(' ; ') || '(vide)'"), '| week', pg.evaluate("document.querySelector('.dw-nav b')?.textContent"))
    before = len(mockgh.LOG)
    pg.locator('.dt-brush').nth(3).click(); pg.wait_for_timeout(500); print('brush', pg.evaluate("document.querySelector('.dt-brush[aria-pressed=true]')?.textContent"))
    col = pg.locator('[data-col]'); pg.evaluate("document.querySelector('[data-colbox]').scrollTop = 7*48; document.querySelector('[data-colbox]').scrollIntoView({block:'start'})"); pg.wait_for_timeout(int(.3*1000))
    bb = col.bounding_box(); pg.mouse.click(bb['x']+150, bb['y']+8*48+5); pg.wait_for_timeout(int(.3*1000)); bb = col.bounding_box(); pg.mouse.click(bb['x']+150, bb['y']+10*48+5); pg.wait_for_timeout(9000)
    print('outbox', pg.evaluate("Object.keys(JSON.parse(localStorage.getItem('suiteDataOutbox:v1')||'{}'))"), '| msg', pg.evaluate("document.querySelector('.dw-msg')?.textContent"), '| day', pg.evaluate("[...document.querySelectorAll('.dw-dlist li span')].map(x=>x.textContent).join(' ; ')"))
    print('writes:', [l for l in mockgh.LOG[before:] if l.startswith('PUT') or 'commit' in l])
    pg.goto(B + 'apps/pilot/mes_missions.html'); pg.wait_for_timeout(int(6*1000))
    print('mes missions:', pg.evaluate("document.querySelector('main')?.innerText.slice(0, 300).replace(/\\n+/g, ' | ')"))
    print('errors', errs or 'none')
    print('api calls:', len(mockgh.LOG), sorted(set(l.split(' ')[0] + ' ' + '/'.join(l.split(' ')[1].split('/')[:5]) for l in mockgh.LOG if not l.startswith('  ')))[:12])
    b.close()
