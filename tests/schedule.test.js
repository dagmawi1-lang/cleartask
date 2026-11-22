import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSchedule, daysBetween } from '../src/lib/schedule.js';

const steps = (...mins) => mins.map((m, i) => ({ id: `s${i}`, title: `Step ${i + 1}`, minutes: m, done: false }));

test('counts days between ISO dates', () => {
  assert.equal(daysBetween('2026-11-22', '2026-11-28'), 6);
  assert.equal(daysBetween('2026-11-28', '2026-11-22'), -6);
});

test('spreads steps across days and keeps a buffer day', () => {
  const s = buildSchedule(steps(30, 30, 30, 30), { today: '2026-11-22', deadline: '2026-11-25', dailyMinutes: 60 });
  assert.equal(s.fits, true);
  assert.equal(s.days.length, 2);
  assert.deepEqual(s.days.map(d => d.date), ['2026-11-22', '2026-11-23']);
  assert.ok(s.days.every(d => d.minutes <= 60));
  assert.match(s.message, /buffer/);
});

test('splits a long step across days and marks partial pieces', () => {
  const s = buildSchedule(steps(90), { today: '2026-11-22', deadline: '2026-11-30', dailyMinutes: 60 });
  assert.equal(s.days.length, 2);
  assert.equal(s.days[0].items[0].partial, true);
  assert.equal(s.days[0].minutes + s.days[1].minutes, 90);
});

test('warns when the work does not fit before the date', () => {
  const s = buildSchedule(steps(120, 120), { today: '2026-11-22', deadline: '2026-11-23', dailyMinutes: 60 });
  assert.equal(s.fits, false);
  assert.match(s.message, /needs 240 minutes but only 120 fit/);
});

test('skips finished steps and handles missing or past dates', () => {
  const done = steps(30).map(x => ({ ...x, done: true }));
  assert.equal(buildSchedule(done, { today: '2026-11-22', deadline: '2026-11-30' }).message, 'Every step is done.');
  assert.match(buildSchedule(steps(30), { today: '2026-11-22', deadline: '' }).message, /Add a target date/);
  assert.equal(buildSchedule(steps(30), { today: '2026-11-22', deadline: '2026-11-01' }).fits, false);
});
