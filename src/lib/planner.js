const MAX_TASK = 700;
const MAX_STEPS = 12;

export function normalizeTask(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TASK);
}

export function isRealDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function normalizePlan(value) {
  if (!value || typeof value !== 'object' || typeof value.task !== 'string' || !Array.isArray(value.steps)) return null;
  const steps = value.steps.slice(0, MAX_STEPS).filter(step => step && typeof step === 'object' && typeof step.id === 'string').map((step, index) => ({
    id: step.id.slice(0, 40) || `step-${index + 1}`,
    title: String(step.title || `Step ${index + 1}`).slice(0, 100),
    detail: String(step.detail || '').slice(0, 300),
    minutes: Math.max(5, Math.min(600, Math.round((Number(step.minutes) || 5) / 5) * 5)),
    done: step.done === true
  }));
  if (!steps.length) return null;
  return { task: normalizeTask(value.task), kind: value.kind === 'school' ? 'school' : 'general', deadline: isRealDate(value.deadline) ? value.deadline : '', availableMinutes: Math.max(15, Math.min(600, Number(value.availableMinutes) || 90)), steps, mode: value.mode === 'ai' ? 'ai' : 'template', note: String(value.note || 'Review and edit this plan before using it.').slice(0, 500) };
}

export function buildPlan(task, options = {}) {
  const clean = normalizeTask(task);
  if (clean.length < 12) {
    return { ok: false, error: 'Describe the task in at least 12 characters so the plan has enough context.' };
  }

  const kind = options.kind === 'school' ? 'school' : 'general';
  const deadline = isRealDate(options.deadline) ? options.deadline : '';
  const availableMinutes = Math.max(15, Math.min(600, Number(options.availableMinutes) || 90));
  const chunks = kind === 'school'
    ? [
        ['Understand the assignment', 'Rewrite the prompt in your own words. Highlight the deliverable, topic, and required format.', 10],
        ['List what you already know', 'Write down relevant notes, class materials, and what you still need to learn.', 10],
        ['Identify missing information', 'Check the rubric or instructions. Mark unclear requirements as questions instead of guessing.', 10],
        ['Gather reliable materials', 'Find the class resources or sources you need. Record where each important fact came from.', 20],
        ['Create a rough structure', 'Arrange your own ideas into an outline, sequence, or project plan.', 15],
        ['Complete the first work session', 'Work on one small section yourself. Keep a note of questions that remain.', 20],
        ['Review against the instructions', 'Compare your work with the prompt or rubric and make a short revision list.', 10],
        ['Prepare the final hand-in', 'Check formatting, citations, required files, and the submission method.', 10]
      ]
    : [
        ['Define the finish line', 'Describe what “done” looks like and how you will know the task is complete.', 10],
        ['Break the task into parts', 'List the major pieces in the order they need to happen.', 10],
        ['Gather what you need', 'Collect materials, information, permissions, or tools before starting.', 15],
        ['Handle the first small action', 'Choose an action that takes less than 15 minutes and creates visible progress.', 15],
        ['Work through the main steps', 'Complete the remaining parts one at a time. Update the plan when reality changes.', 30],
        ['Check the result', 'Compare the result with your finish line and fix anything missing.', 10]
      ];

  const total = chunks.reduce((sum, item) => sum + item[2], 0);
  const scale = availableMinutes / total;
  const steps = chunks.slice(0, MAX_STEPS).map(([title, detail, minutes], index) => ({
    id: `step-${index + 1}`,
    title,
    detail,
    minutes: Math.max(5, Math.round(minutes * scale / 5) * 5),
    done: false
  }));

  return {
    ok: true,
    task: clean,
    kind,
    deadline,
    availableMinutes,
    steps,
    note: 'This is a starter plan generated from a simple template. It has not interpreted your exact instructions. Edit every step so it matches your real task.'
  };
}

export function updateStep(steps, id, patch) {
  if (!Array.isArray(steps)) return [];
  return steps.map((step) => step.id === id ? {
    ...step,
    ...(typeof patch.title === 'string' ? { title: patch.title.slice(0, 100) } : {}),
    ...(typeof patch.detail === 'string' ? { detail: patch.detail.slice(0, 300) } : {}),
    ...(typeof patch.minutes === 'number' ? { minutes: Math.max(5, Math.min(600, Math.round(patch.minutes / 5) * 5)) } : {}),
    ...(typeof patch.done === 'boolean' ? { done: patch.done } : {})
  } : step);
}

export function getProgress(steps = []) {
  const total = Array.isArray(steps) ? steps.length : 0;
  const completed = Array.isArray(steps) ? steps.filter((step) => step?.done === true).length : 0;
  return { total, completed, percent: total ? Math.round(completed / total * 100) : 0 };
}

export function toMarkdown(plan) {
  if (!plan || !Array.isArray(plan.steps)) return '';
  const lines = [`# ${plan.task || 'My ClearTask plan'}`, '', `Estimated work time: ${plan.availableMinutes || 0} minutes`, plan.deadline ? `Target date: ${plan.deadline}` : '', '', '## Steps'];
  for (const [index, step] of plan.steps.entries()) {
    lines.push(`${step.done ? '- [x]' : '- [ ]'} ${index + 1}. ${step.title} (${step.minutes} min)`, `  ${step.detail}`);
  }
  lines.push('', `> ${plan.note || 'Review and edit this plan before using it.'}`);
  return lines.filter((line) => line !== '').join('\n');
}
