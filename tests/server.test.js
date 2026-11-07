import test from 'node:test';
import assert from 'node:assert/strict';
import { createFallbackPlan, createPlanResponse, normalizeAiPlan } from '../server/planner.js';

test('API rejects non-object and too-short input', async () => {
  assert.equal((await createPlanResponse([])).status, 400);
  assert.equal((await createPlanResponse({ task: 'tiny' })).status, 400);
});

test('API returns a local template when no AI key is configured', async () => {
  const result = await createPlanResponse({ task: 'Prepare a short presentation about renewable energy.' }, {});
  assert.equal(result.status, 200);
  assert.equal(result.body.mode, 'template');
  assert.ok(result.body.steps.length >= 3);
});

test('AI output is bounded and malformed output falls back', () => {
  const fallback = createFallbackPlan('Prepare a short presentation about renewable energy.');
  const normalized = normalizeAiPlan({ steps: [
    { title: 'Research', detail: 'Find sources.', minutes: 10 },
    { title: 'Outline', detail: 'Organize your ideas.', minutes: 15 },
    { title: 'Review', detail: 'Check the requirements.', minutes: 10 }
  ], note: 'Review this plan.' }, fallback);
  assert.equal(normalized.mode, 'ai');
  assert.equal(normalized.steps.length, 3);
  assert.equal(normalizeAiPlan({ steps: [{ title: 'Only one', detail: 'Too few.' }] }, fallback), fallback);
});


test('uses a configured AI provider and normalizes its response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.match(String(url), /chat\/completions$/);
    assert.match(options.headers.Authorization, /^Bearer test-key$/);
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ steps: [
      { title: 'Clarify the goal', detail: 'Write the required outcome in your own words.', minutes: 10 },
      { title: 'Collect materials', detail: 'Gather the resources named in the instructions.', minutes: 15 },
      { title: 'Review the result', detail: 'Check your work against the requirements.', minutes: 10 }
    ], note: 'Review every step.' }) } }] }) };
  };
  try {
    const result = await createPlanResponse({ task: 'Prepare a presentation about renewable energy.' }, { AI_API_KEY: 'test-key' });
    assert.equal(result.status, 200);
    assert.equal(result.body.mode, 'ai');
    assert.equal(result.body.steps.length, 3);
  } finally { globalThis.fetch = originalFetch; }
});

test('falls back safely when the configured AI provider fails', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  try {
    const result = await createPlanResponse({ task: 'Prepare a presentation about renewable energy.' }, { AI_API_KEY: 'test-key' });
    assert.equal(result.status, 200);
    assert.equal(result.body.mode, 'template');
    assert.match(result.body.note, /AI service was unavailable/);
  } finally { globalThis.fetch = originalFetch; }
});
