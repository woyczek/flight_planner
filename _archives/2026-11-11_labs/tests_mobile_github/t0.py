import sys, time
sys.path.insert(0, '.')
import mockgh
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True); ctx.add_init_script("localStorage.setItem('repositoryLanguageMode','fr');localStorage.setItem('missionReportingConfig:v1', JSON.stringify({trigram:'RBR'}));")
    ctx.route('https://api.github.com/**', mockgh.handler)
    pg = ctx.new_page(); pg.on('console', lambda m: print('console', m.type, m.text[:300])); pg.on('pageerror', lambda e: print('PAGEERROR', e))
    pg.goto('http://127.0.0.1:8790/apps/settings/profil.html?base=dataAccess'); time.sleep(3)
    pg.fill('[data-gh=repo]', 'Woyczek/flight_planner_data'); pg.fill('[data-gh=token]', 'TESTTOKEN')
    print('buttons', pg.evaluate("[...document.querySelectorAll('button')].filter(b => /Enregistrer|Tester/.test(b.textContent)).map(b => b.textContent.trim() + '|' + b.parentElement.className).join(' ;; ')"))
    pg.evaluate("window.__log=[]; for (const k of ['test','enable','config']) { const f = GitHubData[k]; GitHubData[k] = (...a) => { __log.push(k+' start '+Math.round(performance.now())); return Promise.resolve(f(...a)).then(v => { __log.push(k+' done '+Math.round(performance.now())); return v; }, e => { __log.push(k+' err '+e); throw e; }); }; }")
    pg.get_by_role('button', name='Enregistrer').first.click(); time.sleep(12)
    print('state', pg.evaluate("document.querySelector('[data-gh-state]')?.textContent"), 'flag', pg.evaluate("localStorage.getItem('githubData:on')"), 'ctrl', pg.evaluate("!!navigator.serviceWorker.controller"))
    print(mockgh.LOG); print(pg.evaluate('__log'))
    print('regs', pg.evaluate("navigator.serviceWorker.getRegistrations().then(rs => rs.map(r => r.scope + ' a=' + (r.active?.state) + ' i=' + (r.installing?.state) + ' w=' + (r.waiting?.state)))"))
    print('reg again', pg.evaluate("Promise.race([navigator.serviceWorker.register(GitHubData.ROOT + 'sw.js', {scope: GitHubData.ROOT}).then(() => 'ok'), new Promise(r => setTimeout(() => r('TIMEOUT'), 4000))])"))
    b.close()
