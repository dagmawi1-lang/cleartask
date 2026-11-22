// ClearTask AI engines. Everything runs from the browser:
//  - "device": Chrome's built-in on-device model (Prompt API), nothing leaves the computer
//  - "gemini" / "openai": the user's own API key, kept only for this browser tab
//  - template fallback lives in planner.js
import { normalizeTask } from './planner.js';

export const SYSTEM_PROMPT = 'You help students organize their own work. Never write, solve, or complete graded work, and never include answers, essay text, or code solutions. Use only the task description to organize the work, refer to the specifics the student gave (topic, deliverable, format, sources), and tell the student to verify requirements you were not given. Return only JSON.';

export function planPrompt({ task, kind, deadline, availableMinutes }) {
  return [
    `Task (${kind === 'school' ? 'school assignment' : 'everyday task'}): ${normalizeTask(task)}`,
    deadline ? `Target date: ${deadline}` : 'No target date given.',
    `Time the student expects to spend in total: about ${availableMinutes} minutes.`,
    'Return JSON: {"steps":[{"title":string,"detail":string,"minutes":number}],"questions":[string],"note":string}.',
    'Rules: 4 to 10 steps in order. Titles under 8 words, specific to THIS task. Detail is one or two sentences telling the student what THEY do. Minutes should add up to roughly the total time. "questions" lists up to 3 things the student should check with the teacher or instructions because the description does not say.'
  ].join('\n');
}

export function breakdownPrompt(task, step) {
  return [
    `Overall task: ${normalizeTask(task)}`,
    `The student is stuck on this step: "${step.title}" — ${step.detail} (${step.minutes} min).`,
    'Split it into 3 or 4 tiny actions the student can start right now, each 5 to 15 minutes.',
    'Return JSON: {"steps":[{"title":string,"detail":string,"minutes":number}]}. Do not do the work for them.'
  ].join('\n');
}

export function extractJson(text) {
  if (typeof text !== 'string') return null;
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
}

const DOING_THE_WORK = /\b(here is (your|the) (essay|answer|paragraph|code)|the answer is|final answer|thesis statement:|in conclusion,)/i;
const STOP = new Set('the a an and or of to in on for with my i me is are be this that it as at by from about your you need will have has do make write'.split(' '));

export function keywords(task) {
  return [...new Set(normalizeTask(task).toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || [])].filter(w => !STOP.has(w));
}

/** Validate and normalize model output. Returns {steps, questions, note, checks} or null. */
export function validateAiSteps(payload, { task, min = 3, max = 10, idPrefix = 'ai' } = {}) {
  if (!payload || !Array.isArray(payload.steps)) return null;
  let rejected = 0;
  const steps = payload.steps.slice(0, max + 2).filter(s => s && typeof s === 'object').map((s) => ({
    title: String(s.title || '').replace(/\s+/g, ' ').trim().slice(0, 100),
    detail: String(s.detail || '').replace(/\s+/g, ' ').trim().slice(0, 300),
    minutes: Math.max(5, Math.min(240, Math.round((Number(s.minutes) || 10) / 5) * 5)),
    done: false
  })).filter((s) => {
    const bad = !s.title || !s.detail || DOING_THE_WORK.test(`${s.title} ${s.detail}`);
    if (bad) rejected += 1;
    return !bad;
  }).slice(0, max).map((s, i) => ({ id: `${idPrefix}-${Date.now().toString(36)}-${i + 1}`, ...s }));
  if (steps.length < min) return null;
  const words = keywords(task || '');
  const specific = words.length ? steps.filter(s => words.some(w => `${s.title} ${s.detail}`.toLowerCase().includes(w))).length : 0;
  const questions = Array.isArray(payload.questions) ? payload.questions.filter(q => typeof q === 'string' && q.trim()).slice(0, 3).map(q => q.trim().slice(0, 200)) : [];
  return {
    steps,
    questions,
    note: typeof payload.note === 'string' && payload.note.trim() ? payload.note.trim().slice(0, 400) : '',
    checks: { rejected, specific, total: steps.length }
  };
}

// ---------- engines ----------

export async function deviceStatus() {
  try {
    const LM = globalThis.LanguageModel;
    if (!LM || typeof LM.availability !== 'function') return 'unsupported';
    return await LM.availability(); // 'available' | 'downloadable' | 'downloading' | 'unavailable'
  } catch { return 'unsupported'; }
}

async function runDevice(prompt, signal) {
  const LM = globalThis.LanguageModel;
  const session = await LM.create({ initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }], signal });
  try { return await session.prompt(prompt, { signal }); } finally { session.destroy?.(); }
}

async function runGemini(prompt, { key, model }, signal) {
  const m = model || 'gemini-2.5-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, responseMimeType: 'application/json' }
    })
  });
  if (!res.ok) throw new Error(`Gemini returned ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
}

async function runOpenAI(prompt, { key, model, baseUrl }, signal) {
  const base = String(baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST', signal,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model || 'gpt-4o-mini', temperature: 0.3, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }] })
  });
  if (!res.ok) throw new Error(`Provider returned ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export const ENGINE_LABELS = { device: 'On-device AI (Chrome)', gemini: 'Gemini (your key)', openai: 'OpenAI-compatible (your key)', template: 'Template (no AI)' };

export async function runEngine(engine, prompt, settings = {}, timeoutMs = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    if (engine === 'device') return await runDevice(prompt, controller.signal);
    if (engine === 'gemini') { if (!settings.key) throw new Error('Add your Gemini API key in AI settings.'); return await runGemini(prompt, settings, controller.signal); }
    if (engine === 'openai') { if (!settings.key) throw new Error('Add your API key in AI settings.'); return await runOpenAI(prompt, settings, controller.signal); }
    throw new Error('No AI engine selected.');
  } finally { clearTimeout(timer); }
}
