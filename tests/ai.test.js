import test from 'node:test';
import assert from 'node:assert/strict';
import { extractJson, keywords, planPrompt, validateAiSteps } from '../src/lib/ai.js';

const TASK = 'Prepare a 5-minute presentation comparing solar, wind, and hydro power with three sources.';

test('extracts JSON from fenced or chatty model replies', () => {
  assert.deepEqual(extractJson('```json\n{"steps":[]}\n```'), { steps: [] });
  assert.deepEqual(extractJson('Sure! Here you go: {"a":1} Hope that helps'), { a: 1 });
  assert.equal(extractJson('no json here'), null);
  assert.equal(extractJson('{broken'), null);
});

test('keywords drop stop words and short words', () => {
  const k = keywords(TASK);
  assert.ok(k.includes('solar') && k.includes('hydro') && k.includes('presentation'));
  assert.ok(!k.includes('the') && !k.includes('with'));
});

test('validates, clamps and scores specific AI steps', () => {
  const r = validateAiSteps({ steps: [
    { title: 'List solar pros and cons', detail: 'From your first source, note two pros and cons of solar.', minutes: 13 },
    { title: 'Do the same for wind', detail: 'Repeat for wind power.', minutes: 999 },
    { title: 'Make slides', detail: 'Build one slide per energy type.', minutes: 0 },
    { title: '', detail: 'missing title' }
  ], questions: ['Does the teacher require MLA?', 7], note: 'Draft' }, { task: TASK });
  assert.equal(r.steps.length, 3);
  assert.equal(r.steps[0].minutes, 15);
  assert.equal(r.steps[1].minutes, 240);
  assert.equal(r.steps[2].minutes, 10); // 0 is treated as missing
  assert.equal(r.checks.rejected, 1);
  assert.equal(r.checks.specific, 2);
  assert.deepEqual(r.questions, ['Does the teacher require MLA?']);
});

test('removes steps that try to do the work for the student', () => {
  const r = validateAiSteps({ steps: [
    { title: 'Intro', detail: 'Here is your essay: Solar power is...' },
    { title: 'Research solar', detail: 'Find one source on solar.' },
    { title: 'Research wind', detail: 'Find one source on wind.' },
    { title: 'Conclude', detail: 'The answer is hydro.' },
    { title: 'Research hydro', detail: 'Find one source on hydro.' }
  ] }, { task: TASK });
  assert.equal(r.steps.length, 3);
  assert.equal(r.checks.rejected, 2);
});

test('returns null when too few valid steps remain', () => {
  assert.equal(validateAiSteps({ steps: [{ title: 'a', detail: 'b' }] }, { task: TASK }), null);
  assert.equal(validateAiSteps(null, { task: TASK }), null);
  assert.equal(validateAiSteps({ nope: true }, { task: TASK }), null);
});

test('plan prompt carries the task, date and time budget', () => {
  const p = planPrompt({ task: TASK, kind: 'school', deadline: '2026-11-28', availableMinutes: 120 });
  assert.match(p, /solar, wind, and hydro/);
  assert.match(p, /2026-11-28/);
  assert.match(p, /120 minutes/);
});
