import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, getProgress, isRealDate, normalizePlan, normalizeTask, toMarkdown, updateStep } from '../src/lib/planner.js';

test('normalizes whitespace and caps task length', () => {
  assert.equal(normalizeTask('  Plan   a\nproject  '), 'Plan a project');
  assert.equal(normalizeTask('x'.repeat(900)).length, 700);
});

test('rejects vague or too-short task descriptions', () => {
  const result = buildPlan('finish this');
  assert.equal(result.ok, false);
  assert.match(result.error, /at least 12 characters/);
});

test('builds a school plan with bounded editable steps', () => {
  const result = buildPlan('Prepare a science presentation about renewable energy sources.', { kind: 'school', availableMinutes: 120, deadline: '2026-11-20' });
  assert.equal(result.ok, true);
  assert.equal(result.kind, 'school');
  assert.equal(result.steps.length, 8);
  assert.equal(result.deadline, '2026-11-20');
  assert.ok(result.steps.every(step => step.minutes >= 5));
});

test('builds a general plan and bounds available time', () => {
  const result = buildPlan('Organize a community clean-up event with volunteers.', { kind: 'general', availableMinutes: 9999 });
  assert.equal(result.ok, true);
  assert.equal(result.availableMinutes, 600);
  assert.equal(result.steps.length, 6);
});

test('updates only the selected step and clamps edits', () => {
  const plan = buildPlan('Prepare a science presentation about renewable energy.');
  const changed = updateStep(plan.steps, 'step-1', { title: 'My first step', minutes: 2, done: true });
  assert.equal(changed[0].title, 'My first step');
  assert.equal(changed[0].minutes, 5);
  assert.equal(changed[0].done, true);
  assert.equal(changed[1].done, false);
});

test('calculates progress without mutating the plan', () => {
  const steps = [{ done: true }, { done: false }, { done: true }];
  assert.deepEqual(getProgress(steps), { total: 3, completed: 2, percent: 67 });
  assert.equal(steps[1].done, false);
});

test('exports an editable markdown checklist', () => {
  const plan = buildPlan('Prepare a science presentation about renewable energy.');
  plan.steps[0].done = true;
  const markdown = toMarkdown(plan);
  assert.match(markdown, /^# Prepare a science presentation/m);
  assert.match(markdown, /- \[x\] 1\./);
  assert.match(markdown, /starter plan/);
});

test('accepts only real calendar dates', () => {
  assert.equal(isRealDate('2026-11-20'), true);
  assert.equal(isRealDate('2026-02-30'), false);
  assert.equal(isRealDate('not-a-date'), false);
});

test('normalizes persisted plans and drops malformed step data', () => {
  const normalized = normalizePlan({ task: 'A task with enough detail', kind: 'school', deadline: '2026-02-31', availableMinutes: 9999, steps: [{ id: 'a', title: 'Do thing', detail: 'Details', minutes: 9999, done: true }, null] });
  assert.equal(normalized.deadline, '');
  assert.equal(normalized.availableMinutes, 600);
  assert.equal(normalized.steps.length, 1);
  assert.equal(normalized.steps[0].minutes, 600);
  assert.equal(normalizePlan({ task: 'bad', steps: [] }), null);
});
