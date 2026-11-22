// ClearTask evaluation.
//   node eval/run.mjs                 -> template baseline only (no network)
//   GEMINI_API_KEY=... node eval/run.mjs   -> template vs Gemini on the same 15 tasks
// Metrics per engine:
//   valid     share of replies that pass ClearTask's validator (>=3 usable steps)
//   specific  average share of steps that mention a keyword from the task description
//   rejected  steps removed because they tried to do the work for the student
//   timeFit   average |sum(step minutes) - requested minutes| / requested minutes
//   latency   median seconds per reply
import fs from 'node:fs';
import { buildPlan } from '../src/lib/planner.js';
import { extractJson, keywords, planPrompt, validateAiSteps, SYSTEM_PROMPT } from '../src/lib/ai.js';

const cases = JSON.parse(fs.readFileSync(new URL('./cases.json', import.meta.url)));
const specificShare = (task, steps) => { const k = keywords(task); return steps.filter(s => k.some(w => `${s.title} ${s.detail}`.toLowerCase().includes(w))).length / steps.length; };
const fit = (steps, want) => Math.abs(steps.reduce((a, s) => a + s.minutes, 0) - want) / want;
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

function summarize(name, rows) {
  const ok = rows.filter(r => r.steps);
  const avg = f => ok.length ? ok.reduce((a, r) => a + f(r), 0) / ok.length : 0;
  return { engine: name, cases: rows.length, valid: `${ok.length}/${rows.length}`, specific: `${Math.round(avg(r => r.specific) * 100)}%`, rejected: rows.reduce((a, r) => a + (r.rejected || 0), 0), timeFit: `${Math.round(avg(r => r.fit) * 100)}% off`, latency: `${median(rows.map(r => r.seconds)).toFixed(1)}s` };
}

const template = cases.map(c => { const p = buildPlan(c.task, { kind: c.kind, availableMinutes: c.minutes }); return { steps: p.steps, specific: specificShare(c.task, p.steps), fit: fit(p.steps, c.minutes), seconds: 0 }; });
const results = [summarize('template', template)];

if (process.env.GEMINI_API_KEY) {
  const rows = [];
  for (const c of cases) {
    const t0 = Date.now();
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY }, body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }, contents: [{ role: 'user', parts: [{ text: planPrompt({ task: c.task, kind: c.kind, availableMinutes: c.minutes }) }] }], generationConfig: { temperature: 0.3, responseMimeType: 'application/json' } }) });
      const data = await res.json();
      const v = validateAiSteps(extractJson(data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || ''), { task: c.task });
      rows.push(v ? { steps: v.steps, specific: specificShare(c.task, v.steps), fit: fit(v.steps, c.minutes), rejected: v.checks.rejected, seconds: (Date.now() - t0) / 1000 } : { steps: null, seconds: (Date.now() - t0) / 1000 });
    } catch { rows.push({ steps: null, seconds: (Date.now() - t0) / 1000 }); }
  }
  results.push(summarize(process.env.GEMINI_MODEL || 'gemini-2.5-flash', rows));
}
console.table(results);
