import { buildPlan, normalizeTask } from '../src/lib/planner.js';

export function createFallbackPlan(task, options = {}) {
  const plan = buildPlan(task, options);
  if (!plan.ok) return plan;
  return { ...plan, mode: 'template', note: 'Template-based starter plan. It has not interpreted your exact instructions. Edit every step so it matches your real task.' };
}

export function normalizeAiPlan(payload, fallback) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.steps)) return fallback;
  const steps = payload.steps.slice(0, 12).filter(step => step && typeof step === 'object').map((step, index) => ({
    id: `ai-step-${index + 1}`,
    title: String(step.title || '').trim().slice(0, 100),
    detail: String(step.detail || '').trim().slice(0, 300),
    minutes: Math.max(5, Math.min(600, Math.round((Number(step.minutes) || 10) / 5) * 5)),
    done: false
  })).filter(step => step.title && step.detail);
  if (steps.length < 3) return fallback;
  const totalMinutes = steps.reduce((sum, step) => sum + step.minutes, 0);
  return {
    ...fallback,
    steps,
    availableMinutes: Math.min(600, totalMinutes),
    mode: 'ai',
    note: typeof payload.note === 'string' && payload.note.trim()
      ? payload.note.trim().slice(0, 500)
      : 'AI-generated suggestions are drafts. Check them against your real instructions and edit anything that does not fit.'
  };
}

export async function createPlanResponse(input, env = process.env) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { status: 400, body: { error: 'Expected a JSON object.' } };
  const task = normalizeTask(input.task);
  const options = { kind: input.kind, deadline: input.deadline, availableMinutes: input.availableMinutes };
  const fallback = createFallbackPlan(task, options);
  if (!fallback.ok) return { status: 400, body: { error: fallback.error } };
  if (!env.AI_API_KEY) return { status: 200, body: fallback };

  try {
    const base = String(env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.AI_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(18000),
      body: JSON.stringify({
        model: env.AI_MODEL || 'gpt-4o-mini',
        temperature: 0.25,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You help students organize their own work. Never write, solve, or complete graded assignments. Return only JSON with a steps array (3 to 10 items), each with title, detail, and minutes, plus a short note. Use the user description only to organize work, ask the student to verify all requirements, and never invent facts about the assignment. Keep each step practical and editable.' },
          { role: 'user', content: JSON.stringify({ task, kind: options.kind, deadline: options.deadline, availableMinutes: options.availableMinutes }) }
        ]
      })
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(typeof raw === 'string' ? raw : '{}');
    return { status: 200, body: normalizeAiPlan(parsed, fallback) };
  } catch {
    return { status: 200, body: { ...fallback, note: `${fallback.note} The AI service was unavailable, so ClearTask used its local template instead.` } };
  }
}
