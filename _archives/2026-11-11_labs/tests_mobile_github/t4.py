import sys, os
sys.path.insert(0, '.')
import mockgh
from playwright.sync_api import sync_playwright
B = 'http://127.0.0.1:8790/'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    pages = []
    for tri in ('RBR', 'DRO'):
        ctx = b.new_context(); ctx.add_init_script(f"localStorage.setItem('missionReportingConfig:v1', JSON.stringify({{trigram:'{tri}'}}));")
        ctx.route('https://api.github.com/**', mockgh.handler)
        pg = ctx.new_page(); pg.on('console', lambda m: print(tri, m.text) if 'DBG' in m.text else None); pg.goto(B + 'apps/settings/profil.html?base=dataAccess'); pg.wait_for_timeout(2500)
        pg.evaluate("GitHubData.enable({repo:'Woyczek/flight_planner_data', branch:'main', token:'TESTTOKEN'})"); pg.wait_for_timeout(1500)
        pg.goto(B + 'apps/cr/HEMS/hems_medevac_cr.html'); pg.wait_for_timeout(5000)
        pg.evaluate("MissionLedger.load()"); pages.append((tri, pg))
    for tri, pg in pages:  # les deux ont lu la même version ; chacun ajoute son CR
        pg.evaluate(f"(() => {{ const m = structuredClone(MissionLedger.store.missions.find(x => x.family === 'HEMS') || MissionLedger.store.missions[0]); m.metadata.date = '{'2026-10-29' if tri == 'RBR' else '2026-10-28'}'; MissionLedger.store.missions.push(m); }})()")
    for tri, pg in pages:
        pg.evaluate("window.__gt = GitHubData.getText; GitHubData.getText = (...a) => __gt(...a).then(g => { (window.__g ||= []).push((g?.sha||'-').slice(0,7) + ' RBR=' + /TEST-RBR/.test(g?.text||'')); return g; }, e => { (window.__g ||= []).push('ERR ' + e); throw e; }); 0")
        print(tri, 'before: store.updatedAt', pg.evaluate("MissionLedger.store.updatedAt"), 'gh updatedAt', pg.evaluate("GitHubData.getText('cr/missions.yaml').then(g => jsyaml.load(g.text).updatedAt)"))
        print(tri, pg.evaluate("MissionLedger.save({request: false}).then(r => r.written, e => e.stack)"), pg.evaluate("window.__g"), pg.evaluate("MissionLedger.store.missions.map(m => m.metadata?.missionId).filter(x => /TEST/.test(x))"))
    txt = open(os.path.join(mockgh.REPO, 'cr', 'missions.yaml'), encoding='utf-8').read()
    print('2026-10-29' in txt, '2026-10-28' in txt, txt.count('missionId'), [l for l in mockgh.LOG if l.startswith('PUT') or 'commit' in l])
    b.close()
