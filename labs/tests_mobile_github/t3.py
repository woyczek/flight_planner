# Registre des CR en mode GitHub : lecture, ajout d'un CR, écriture ; puis conflit simulé (registre changé « ailleurs ») → fusion
import sys, os, time
sys.path.insert(0, '.')
import mockgh
from playwright.sync_api import sync_playwright
B = 'http://127.0.0.1:8790/'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    ctx.add_init_script("localStorage.setItem('missionReportingConfig:v1', JSON.stringify({trigram:'RBR'}));")
    ctx.route('https://api.github.com/**', mockgh.handler)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(B + 'apps/settings/profil.html?base=dataAccess'); pg.wait_for_timeout(2500)
    pg.evaluate("GitHubData.enable({repo:'Woyczek/flight_planner_data', branch:'main', token:'TESTTOKEN'})"); pg.wait_for_timeout(1500)
    pg.goto(B + 'apps/cr/HEMS/hems_medevac_cr.html'); pg.wait_for_timeout(6000)
    print('controlled', pg.evaluate("!!navigator.serviceWorker.controller"), '| ledger', pg.evaluate("MissionLedger.load().then(() => MissionLedger.store.missions.length + ' CR, source ' + MissionLedger.store.source)"))
    n0 = pg.evaluate("MissionLedger.store.missions.length")
    # autre pilote : un CR ajouté directement dans le dépôt (simulé) après la lecture
    yml = os.path.join(mockgh.REPO, 'cr', 'missions.yaml'); txt = open(yml, encoding='utf-8').read()
    print('file missions before', txt.count('missionId'))
    pg.evaluate("MissionLedger.store.missions.push({family: 'HEMS', metadata: {missionId: 'TEST-APP-1', date: '2026-10-20'}, aircraft: [], crew: []})")
    r = pg.evaluate("MissionLedger.save({request: false}).then(r => JSON.stringify({written: r.written}))")
    pg.wait_for_timeout(1000)
    print('save', r, '| PUTs', [l for l in mockgh.LOG if l.startswith('PUT')][-2:])
    txt2 = open(yml, encoding='utf-8').read(); print('file has TEST-APP-1', 'TEST-APP-1' in txt2, '| missionId count', txt2.count('missionId'), '| was', txt.count('missionId'))
    print('errors', errs or 'none')
    b.close()
