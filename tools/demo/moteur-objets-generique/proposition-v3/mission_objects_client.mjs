import test from 'node:test';
import assert from 'node:assert/strict';
import { create, declarations } from '../../../frame/lib/mission_objects.js';

const flight = { mission: 'N-001', started: { at: '2026-11-24T10:00:00Z' } };
const raw = { objects: [{ id: 'SHIP-1', kind: 'ship', lat: 48, lon: -2, motion: 'axis', speed_kt: 8, course_deg: 65, secret_text: 'not sent' }], turning_points: [{ id: 'PT1', lat: 48.1, lon: -2 }] };
const tick = () => new Promise(resolve => setImmediate(resolve));
async function settle(fn) { for (let i = 0; i < 30 && !fn(); i++) await tick(); assert.ok(fn(), 'asynchronous lifecycle finished'); }
function fixture(extra = {}) {
  const calls = [];
  const data = { read: async p => ({ value: JSON.stringify(p.endsWith('mission_registry.yaml') ? { missions: [{ id: 'N-001', folder: 'N_MARITIME/N-001', files: ['missionN-001.yaml'] }] } : raw) }) };
  const request = async (route, opts) => {
    calls.push({ route, opts });
    if (route.startsWith('mission-objects/events')) return { status: 200, body: { session: 'S1', events: [] } };
    return { status: 200, body: { active: !!opts.json.flight, session: 'S1', objects: 1, agent_connected: true } };
  };
  const controller = create({ data, request, local: () => true, parse: JSON.parse, interval: 999999, ...extra });
  return { calls, controller };
}
test('a declaration contains object parameters and points, not briefing or arbitrary fields', () => {
  const d = declarations(raw);
  assert.equal(d.objects[0].speed_kt, 8);
  assert.equal(d.points[0].id, 'PT1');
  assert.equal(d.objects[0].secret_text, undefined);
});
test('starting any indexed mission publishes its parameters to the existing launcher', async () => {
  const { calls, controller } = fixture();
  try {
    controller.update(flight, 'ALF');
    await settle(() => calls.some(c => c.opts?.json?.flight));
    assert.equal(calls[0].opts.json.flight.mission, 'N-001');
    assert.equal(calls[0].opts.json.objects[0].id, 'SHIP-1');
  } finally { controller.stop(); }
});
test('stopping the flight sends an empty session instead of leaving old objects', async () => {
  const { calls, controller } = fixture();
  try {
    controller.update(flight, 'ALF');
    await settle(() => calls.some(c => c.opts?.json?.flight));
    controller.update(null, 'ALF');
    await settle(() => calls.some(c => c.opts?.json?.flight === null));
  } finally { controller.stop(); }
});
test('a tablet or hosted page cannot start objects on another computer', async () => {
  const { calls, controller } = fixture({ local: () => false });
  controller.update(flight, 'ALF');
  await tick();
  assert.equal(calls.length, 0);
  controller.stop();
});
test('a script confirmation is delivered with its mission identity to the frame', async () => {
  const received = [];
  const event = { type: 'object_found', mission: 'N-001', object: 'SHIP-1', session: 'S1', cursor: 1 };
  const { controller } = fixture({ onFound: e => received.push(e), request: async (route, opts) => route.includes('/events') ? { status: 200, body: { session: 'S1', events: [event] } } : { status: 200, body: { active: true, session: 'S1', objects: 1, agent_connected: true } } });
  try {
    controller.update(flight, 'ALF');
    await settle(() => received.length === 1);
    assert.equal(received[0].object, 'SHIP-1');
  } finally { controller.stop(); }
});
