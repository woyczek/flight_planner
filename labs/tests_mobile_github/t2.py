import sys, time
sys.path.insert(0, '.')
import mockgh
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    ctx.route('https://api.github.com/**', mockgh.handler)
    pg = ctx.new_page(); pg.on('console', lambda m: print('console', m.text[:300]) if m.type in ('error', 'warning') else None)
    pg.goto('http://127.0.0.1:8790/apps/settings/profil.html?base=dataAccess'); time.sleep(3)
    for step in ["new Promise(r => { const q = indexedDB.open('sogGithubData', 1); q.onupgradeneeded = () => q.result.createObjectStore('kv'); q.onsuccess = () => r('idb ok'); q.onerror = () => r('idb err ' + q.error); q.onblocked = () => r('blocked'); setTimeout(() => r('idb timeout'), 3000); })",
                 "Promise.race([navigator.serviceWorker.register(GitHubData.ROOT + 'sw.js', {scope: GitHubData.ROOT}).then(r => 'reg ok ' + r.scope, e => 'reg err ' + e), new Promise(r => setTimeout(() => r('reg timeout'), 5000))])",
                 "Promise.race([GitHubData.enable({repo:'Woyczek/flight_planner_data', branch:'main', token:'TESTTOKEN'}).then(x => 'enable ' + x, e => 'enable err ' + e), new Promise(r => setTimeout(() => r('enable timeout'), 6000))])"]:
        print(pg.evaluate(step))
    b.close()
