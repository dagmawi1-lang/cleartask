import React, { useEffect, useMemo, useState } from 'react';
import Icon from './icons.jsx';
import { buildPlan, getProgress, normalizePlan, toMarkdown, updateStep } from './lib/planner.js';
import { buildSchedule } from './lib/schedule.js';
import { ENGINE_LABELS, breakdownPrompt, deviceStatus, extractJson, planPrompt, runEngine, validateAiSteps } from './lib/ai.js';

const STORAGE_KEY = 'cleartask-plan-v2';
const PREFS_KEY = 'cleartask-prefs-v2';
const KEY_KEY = 'cleartask-session-key';

function safeGet(store, key) { try { return store.getItem(key); } catch { return null; } }
function safeSet(store, key, value) { try { store.setItem(key, value); return true; } catch { return false; } }

function loadPlan() {
  try {
    const saved = JSON.parse(safeGet(localStorage, STORAGE_KEY) || safeGet(localStorage, 'cleartask-plan-v1'));
    const normalized = normalizePlan(saved);
    if (normalized) return { ...normalized, questions: Array.isArray(saved.questions) ? saved.questions.slice(0, 3) : [], checks: saved.checks || null };
  } catch { /* storage may be disabled */ }
  return null;
}
function loadPrefs() {
  try { return { engine: 'template', model: '', baseUrl: '', daily: 60, ...JSON.parse(safeGet(localStorage, PREFS_KEY) || '{}') }; }
  catch { return { engine: 'template', model: '', baseUrl: '', daily: 60 }; }
}
const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

function templateBreakdown(step) {
  const third = Math.max(5, Math.round(step.minutes / 3 / 5) * 5);
  return [
    { title: `Open what you need for “${step.title}”`, detail: 'Put the instructions, notes, and tools in front of you. Close everything else.', minutes: 5 },
    { title: 'Do a rough 10-minute pass', detail: 'Start badly on purpose. Messy progress beats a blank page.', minutes: Math.max(10, third) },
    { title: 'Write down what is blocking you', detail: 'List the exact questions you have, then ask a teacher, classmate, or check the instructions.', minutes: 5 },
    { title: 'Finish and check this step', detail: step.detail, minutes: Math.max(5, step.minutes - third - 10) }
  ].map((s, i) => ({ ...s, id: `split-${Date.now().toString(36)}-${i}`, done: false }));
}

export default function App() {
  const [plan, setPlan] = useState(loadPlan);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [apiKey, setApiKey] = useState(() => safeGet(sessionStorage, KEY_KEY) || '');
  const [device, setDevice] = useState('checking');
  const [showSettings, setShowSettings] = useState(false);
  const [task, setTask] = useState('');
  const [kind, setKind] = useState('school');
  const [deadline, setDeadline] = useState('');
  const [minutes, setMinutes] = useState(90);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');
  const progress = useMemo(() => getProgress(plan?.steps || []), [plan]);
  const totalMinutes = plan ? plan.steps.reduce((s, x) => s + x.minutes, 0) : 0;
  const schedule = useMemo(() => plan ? buildSchedule(plan.steps, { today: today(), deadline: plan.deadline, dailyMinutes: prefs.daily }) : null, [plan, prefs.daily]);

  useEffect(() => { deviceStatus().then(setDevice); }, []);
  useEffect(() => { if (plan && !safeSet(localStorage, STORAGE_KEY, JSON.stringify(plan))) setToast('Browser storage is unavailable. Export your plan to keep a copy.'); }, [plan]);
  useEffect(() => { safeSet(localStorage, PREFS_KEY, JSON.stringify(prefs)); }, [prefs]);
  useEffect(() => { if (apiKey) safeSet(sessionStorage, KEY_KEY, apiKey); else try { sessionStorage.removeItem(KEY_KEY); } catch { /* ignore */ } }, [apiKey]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 6000); return () => clearTimeout(t); }, [toast]);

  const engine = prefs.engine;
  const engineReady = engine === 'template' || (engine === 'device' ? device === 'available' || device === 'downloadable' : Boolean(apiKey));
  const settings = { key: apiKey, model: prefs.model, baseUrl: prefs.baseUrl };

  async function createPlan(event) {
    event.preventDefault();
    const fallback = buildPlan(task, { kind, deadline, availableMinutes: minutes });
    if (!fallback.ok) { setError(fallback.error); return; }
    setError(''); setEditing(null);
    if (engine === 'template' || !engineReady) {
      setPlan({ ...fallback, mode: 'template', engine: ENGINE_LABELS.template, questions: [], checks: null, note: engine === 'template' ? fallback.note : `${fallback.note} The AI engine isn't set up yet, so the template was used.` });
      return;
    }
    setBusy('plan');
    try {
      const raw = await runEngine(engine, planPrompt({ task, kind, deadline, availableMinutes: minutes }), settings);
      const result = validateAiSteps(extractJson(raw), { task, min: 3, max: 10 });
      if (!result) throw new Error('The AI reply did not pass ClearTask’s checks.');
      setPlan({ task: fallback.task, kind, deadline: fallback.deadline, availableMinutes: fallback.availableMinutes, steps: result.steps, mode: 'ai', engine: ENGINE_LABELS[engine], questions: result.questions, checks: result.checks, note: result.note || 'AI-drafted plan. Check it against your real instructions and edit anything that does not fit.' });
    } catch (e) {
      setPlan({ ...fallback, mode: 'template', engine: ENGINE_LABELS.template, questions: [], checks: null, note: `${fallback.note} AI was unavailable (${e.message}), so the template was used.` });
    } finally { setBusy(''); }
  }

  async function splitStep(step) {
    setBusy(step.id);
    let pieces = null;
    if (engine !== 'template' && engineReady) {
      try {
        const raw = await runEngine(engine, breakdownPrompt(plan.task, step), settings);
        pieces = validateAiSteps(extractJson(raw), { task: plan.task, min: 2, max: 5, idPrefix: 'split' })?.steps || null;
      } catch { pieces = null; }
      if (!pieces) setToast('AI could not split that step, so ClearTask used its built-in breakdown.');
    }
    pieces = pieces || templateBreakdown(step);
    setPlan(p => {
      const i = p.steps.findIndex(s => s.id === step.id);
      const steps = [...p.steps.slice(0, i), ...pieces, ...p.steps.slice(i + 1)].slice(0, 16);
      return { ...p, steps };
    });
    setBusy('');
  }

  function addStep() {
    const id = `own-${Date.now().toString(36)}`;
    setPlan(p => ({ ...p, steps: [...p.steps, { id, title: 'New step', detail: 'Describe what you will do.', minutes: 15, done: false }].slice(0, 16) }));
    setEditing(id);
  }
  function removeStep(id) { setPlan(p => p.steps.length > 1 ? { ...p, steps: p.steps.filter(s => s.id !== id) } : p); }

  function exportPlan() {
    if (!plan) return;
    const blob = new Blob([toMarkdown(plan, schedule)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'my-cleartask-plan.md'; link.click();
    URL.revokeObjectURL(url);
  }

  const deviceText = { available: 'Ready on this computer', downloadable: 'Available (Chrome downloads the model on first use)', downloading: 'Chrome is downloading the model…', unavailable: 'Not available on this device', unsupported: 'Not supported in this browser', checking: 'Checking…' }[device] || device;

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Icon name="target" size={20}/></span><span>clear<span>task</span></span></div>
      <div className="side-caption">YOUR WORKSPACE</div>
      <div className="side-link active"><Icon name="list" size={17}/> My plan</div>
      <button className="side-link as-button" onClick={() => setShowSettings(s => !s)}><Icon name="settings" size={17}/> AI settings</button>
      <div className="side-card"><Icon name="sparkles" size={17}/><b>Make the next step clear.</b><p>Start with your own task. ClearTask organizes it without doing the work for you.</p></div>
      <div className="side-foot">GLOBAL AI BUILDER'S CHALLENGE<br/><span>Student productivity · Version 2.0</span></div>
    </aside>
    <main className="main">
      <header className="header"><div><div className="eyebrow">A SMALLER WAY TO START</div><h1>Turn “where do I begin?” into a plan.</h1><p>Describe the task. Shape the steps. Keep moving at your own pace.</p></div>
        <div className="header-actions"><button className="button secondary" onClick={() => setShowSettings(s => !s)}><Icon name="settings"/> {ENGINE_LABELS[engine]}</button><button className="button secondary" onClick={exportPlan} disabled={!plan}><Icon name="download"/> Export plan</button></div></header>

      {showSettings && <section className="panel settings-panel" aria-label="AI settings">
        <div className="panel-heading"><span className="step-number"><Icon name="settings" size={14}/></span><div><h2>AI settings</h2><p>Pick how ClearTask drafts plans. You can always fall back to the template, which never sends anything anywhere.</p></div></div>
        <div className="engine-grid">
          {['device', 'gemini', 'openai', 'template'].map(id => <label key={id} className={'engine-card ' + (engine === id ? 'selected' : '')}>
            <input type="radio" name="engine" value={id} checked={engine === id} onChange={() => setPrefs(p => ({ ...p, engine: id }))}/>
            <b>{ENGINE_LABELS[id]}</b>
            <small>{id === 'device' ? `Private: runs on your computer. ${deviceText}.` : id === 'gemini' ? 'Uses your free Google AI Studio key. Your task text goes to Google.' : id === 'openai' ? 'Any OpenAI-compatible endpoint. Your task text goes to that provider.' : 'No AI. Same starter plan every time, nothing leaves the browser.'}</small>
          </label>)}
        </div>
        {(engine === 'gemini' || engine === 'openai') && <div className="field-grid three">
          <label><span className="field-label">API key (kept only for this tab)</span><input type="password" autoComplete="off" value={apiKey} onChange={e => setApiKey(e.target.value.trim())} placeholder={engine === 'gemini' ? 'AIza…' : 'sk-…'}/></label>
          <label><span className="field-label">Model (optional)</span><input value={prefs.model} onChange={e => setPrefs(p => ({ ...p, model: e.target.value.trim() }))} placeholder={engine === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini'}/></label>
          {engine === 'openai' && <label><span className="field-label">Base URL (optional)</span><input value={prefs.baseUrl} onChange={e => setPrefs(p => ({ ...p, baseUrl: e.target.value.trim() }))} placeholder="https://api.openai.com/v1"/></label>}
        </div>}
        <p className="privacy-note"><Icon name="shield"/> Keys live in this tab's session storage only and are cleared when you close it. ClearTask has no server.</p>
      </section>}

      <section className="summary-grid">
        <div className="summary-card"><span className="summary-icon purple"><Icon name="target" size={18}/></span><div><small>YOUR TASK</small><b>{plan ? (plan.mode === 'ai' ? 'AI-drafted plan' : 'Starter plan') : 'Not started'}</b></div></div>
        <div className="summary-card"><span className="summary-icon blue"><Icon name="list" size={18}/></span><div><small>PROGRESS</small><b>{progress.completed} / {progress.total} steps</b></div></div>
        <div className="summary-card"><span className="summary-icon green"><Icon name="clock" size={18}/></span><div><small>ESTIMATED TIME</small><b>{totalMinutes} minutes</b></div></div>
      </section>
      <div className="content-grid">
        <div>
          <section className="panel create-panel">
            <div className="panel-heading"><span className="step-number">01</span><div><h2>Describe your task</h2><p>Use your own words. A specific goal makes a more useful plan.</p></div></div>
            <form onSubmit={createPlan}>
              <label className="field-label" htmlFor="task">What are you trying to get done?</label>
              <textarea id="task" value={task} onChange={e => setTask(e.target.value)} maxLength={700} rows={5} placeholder="Example: Prepare a 5-minute presentation comparing solar, wind, and hydro power. I need three sources and a slide deck." />
              <div className="char-count">{task.length}/700</div>
              <div className="field-grid"><label><span className="field-label">Task type</span><select value={kind} onChange={e => setKind(e.target.value)}><option value="school">School assignment</option><option value="general">Everyday task</option></select></label><label><span className="field-label">Target date (optional)</span><input type="date" min={today()} value={deadline} onChange={e => setDeadline(e.target.value)}/></label></div>
              <label className="field-label range-label" htmlFor="minutes">Total work time <strong>{minutes} min</strong></label>
              <input id="minutes" className="range" type="range" min="30" max="600" step="15" value={minutes} onChange={e => setMinutes(Number(e.target.value))}/>
              {error && <p className="error" role="alert">{error}</p>}
              <button className="button primary full" type="submit" disabled={busy === 'plan'}>{busy === 'plan' ? `Drafting with ${ENGINE_LABELS[engine]}…` : engine === 'template' ? 'Build my starter plan' : 'Draft my plan with AI'} <Icon name="sparkles" size={17}/></button>
              {engine !== 'template' && !engineReady && <p className="hint">AI isn't set up yet. <button type="button" className="link" onClick={() => setShowSettings(true)}>Open AI settings</button> or the template will be used.</p>}
            </form>
          </section>
          {plan && schedule && <section className="panel schedule-panel">
            <div className="panel-heading"><span className="step-number">03</span><div><h2>Fit it into your days</h2><p>ClearTask spreads the unfinished steps across the days before your target date.</p></div></div>
            <label className="field-label range-label" htmlFor="daily">Time you can give it per day <strong>{prefs.daily} min</strong></label>
            <input id="daily" className="range" type="range" min="15" max="240" step="15" value={prefs.daily} onChange={e => setPrefs(p => ({ ...p, daily: Number(e.target.value) }))}/>
            <p className={'schedule-msg ' + (schedule.fits ? 'ok' : 'warn')}>{schedule.message}</p>
            <ol className="days">{schedule.days.map(d => <li key={d.date}><b>{new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</b><span>{d.minutes} min</span><p>{d.items.map(i => i.title + (i.partial ? ' (part)' : '')).join(' · ')}</p></li>)}</ol>
          </section>}
        </div>
        <section className="panel plan-panel">
          <div className="plan-head"><div><div className="eyebrow">02 · YOUR WORKFLOW</div><h2>{plan ? 'Your next steps' : 'Your plan will appear here'}</h2></div><button className="icon-button" onClick={() => { setPlan(null); setEditing(null); }} disabled={!plan} title="Clear plan" aria-label="Clear plan"><Icon name="reset" size={17}/></button></div>
          {plan ? <>
            <div className="task-title"><span><Icon name="book"/>{plan.kind === 'school' ? 'SCHOOL TASK' : 'EVERYDAY TASK'} · {plan.engine || (plan.mode === 'ai' ? 'AI' : 'Template')}</span><h3>{plan.task}</h3>{plan.deadline && <small><Icon name="calendar" size={14}/> Target date: {plan.deadline}</small>}</div>
            {plan.checks && <div className="checks" aria-label="AI quality checks"><Icon name="shield"/><span><b>{plan.checks.specific}/{plan.checks.total}</b> steps refer to details from your description</span>{plan.checks.rejected > 0 && <span><b>{plan.checks.rejected}</b> AI step{plan.checks.rejected === 1 ? '' : 's'} removed for trying to do the work for you</span>}</div>}
            <div className="progress-wrap"><div className="progress-label"><b>Progress</b><strong>{progress.percent}%</strong></div><div className="progress-track"><span style={{ width: `${progress.percent}%` }}/></div></div>
            <div className="steps-list">{plan.steps.map((step, index) => <article className={'step-card ' + (step.done ? 'done' : '')} key={step.id}>
              <button className="step-check" aria-label={step.done ? 'Mark step incomplete' : 'Mark step complete'} onClick={() => setPlan(p => ({ ...p, steps: updateStep(p.steps, step.id, { done: !step.done }) }))}><Icon name={step.done ? 'check' : 'circle'} size={17}/></button>
              <div className="step-body">{editing === step.id ? <><input className="edit-title" autoFocus value={step.title} maxLength={100} onChange={e => setPlan(p => ({ ...p, steps: updateStep(p.steps, step.id, { title: e.target.value }) }))}/><textarea className="edit-detail" value={step.detail} maxLength={300} rows={2} onChange={e => setPlan(p => ({ ...p, steps: updateStep(p.steps, step.id, { detail: e.target.value }) }))}/><label className="mini">Minutes <input type="number" min="5" max="600" step="5" value={step.minutes} onChange={e => setPlan(p => ({ ...p, steps: updateStep(p.steps, step.id, { minutes: Number(e.target.value) }) }))}/></label><button className="save-edit" onClick={() => setEditing(null)}>Done editing</button></> : <><b>{index + 1}. {step.title}</b><p>{step.detail}</p>{!step.done && <button className="stuck" onClick={() => splitStep(step)} disabled={Boolean(busy)}><Icon name="split" size={13}/>{busy === step.id ? 'Splitting…' : 'I’m stuck — split this step'}</button>}</>}</div>
              <div className="step-tools"><span>{step.minutes}m</span><button onClick={() => setEditing(editing === step.id ? null : step.id)} aria-label={`Edit ${step.title}`} title="Edit step"><Icon name="edit" size={15}/></button><button onClick={() => removeStep(step.id)} aria-label={`Delete ${step.title}`} title="Delete step"><Icon name="trash" size={15}/></button></div>
            </article>)}</div>
            <button className="button secondary add" onClick={addStep}><Icon name="plus"/> Add your own step</button>
            {plan.questions?.length > 0 && <div className="questions"><b><Icon name="help"/> Check these before you start</b><ul>{plan.questions.map(q => <li key={q}>{q}</li>)}</ul></div>}
            <div className="plan-disclaimer"><Icon name="sparkles" size={15}/><p>{plan.note} {plan.mode === 'ai' ? 'AI-assisted draft.' : 'Template-based draft.'}</p></div>
          </> : <div className="empty-plan"><div><Icon name="cap" size={30}/></div><h3>Your plan starts with your words.</h3><p>Describe the task on the left, then build a plan you can edit and make your own.</p></div>}
        </section>
      </div>
      <footer className="footer"><span>ClearTask 2.0 · Built by Dagmawi Melaku with AI assistance</span><span>Organizes the work. Doesn't do the work.</span></footer>
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  </div>;
}
