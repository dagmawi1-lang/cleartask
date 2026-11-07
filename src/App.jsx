import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2, Circle, Clock3, Edit3, GraduationCap, ListChecks, Plus, RotateCcw, Sparkles, Target, Trash2 } from 'lucide-react';
import { buildPlan, getProgress, normalizePlan, toMarkdown, updateStep } from './lib/planner.js';

const STORAGE_KEY = 'cleartask-plan-v1';
function loadPlan() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const normalized = normalizePlan(saved);
    if (normalized) return normalized;
  } catch { /* local storage may be disabled */ }
  return null;
}

export default function App() {
  const [plan, setPlan] = useState(loadPlan);
  const [task, setTask] = useState('');
  const [kind, setKind] = useState('school');
  const [deadline, setDeadline] = useState('');
  const [minutes, setMinutes] = useState(90);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [storageNote, setStorageNote] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);
  const progress = useMemo(() => getProgress(plan?.steps || []), [plan]);

  useEffect(() => {
    if (!plan) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plan)); setStorageNote(''); }
    catch { setStorageNote('Browser storage is unavailable. Export your plan to keep a copy.'); }
  }, [plan]);

  async function createPlan(event) {
    event.preventDefault();
    const fallback = buildPlan(task, { kind, deadline, availableMinutes: minutes });
    if (!fallback.ok) { setError(fallback.error); return; }
    setIsBuilding(true); setError('');
    try {
      const response = await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task, kind, deadline, availableMinutes: minutes }) });
      if (!response.ok) throw new Error('Planner service unavailable');
      const result = await response.json();
      const normalized = normalizePlan(result);
      if (!normalized || normalized.steps.length < 3) throw new Error('Planner returned an incomplete plan');
      setPlan(normalized); setEditing(null);
    } catch {
      setPlan({ ...fallback, mode: 'template', note: `${fallback.note} The planner service was unavailable, so the local template was used.` });
      setEditing(null);
    } finally { setIsBuilding(false); }
  }

  function exportPlan() {
    if (!plan) return;
    const blob = new Blob([toMarkdown(plan)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'my-cleartask-plan.md'; link.click();
    URL.revokeObjectURL(url);
  }

  function resetPlan() { setPlan(null); setEditing(null); setError(''); }

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Target size={20}/></span><span>clear<span>task</span></span></div>
      <div className="side-caption">YOUR WORKSPACE</div>
      <div className="side-link active"><ListChecks size={17}/> My plan</div>
      <div className="side-card"><Sparkles size={17}/><b>Make the next step clear.</b><p>Start with your own task. ClearTask helps you organize it without doing the work for you.</p></div>
      <div className="side-foot">GLOBAL AI BUILDER'S CHALLENGE<br/><span>Student productivity · Prototype 1.0</span></div>
    </aside>
    <main className="main">
      <header className="header"><div><div className="eyebrow">A SMALLER WAY TO START</div><h1>Turn “where do I begin?” into a plan.</h1><p>Describe the task. Shape the steps. Keep moving at your own pace.</p></div><button className="button secondary" onClick={exportPlan} disabled={!plan}><ArrowDownToLine size={16}/> Export plan</button></header>
      <section className="summary-grid">
        <div className="summary-card"><span className="summary-icon purple"><Target size={18}/></span><div><small>YOUR TASK</small><b>{plan ? 'One clear goal' : 'Not started'}</b></div></div>
        <div className="summary-card"><span className="summary-icon blue"><ListChecks size={18}/></span><div><small>PROGRESS</small><b>{progress.completed} / {progress.total} steps</b></div></div>
        <div className="summary-card"><span className="summary-icon green"><Clock3 size={18}/></span><div><small>ESTIMATED TIME</small><b>{plan?.availableMinutes || 0} minutes</b></div></div>
      </section>
      <div className="content-grid">
        <section className="panel create-panel">
          <div className="panel-heading"><span className="step-number">01</span><div><h2>Describe your task</h2><p>Use your own words. A specific goal makes a more useful plan.</p></div></div>
          <form onSubmit={createPlan}>
            <label className="field-label" htmlFor="task">What are you trying to get done?</label>
            <textarea id="task" value={task} onChange={e=>setTask(e.target.value)} maxLength={700} rows={5} placeholder="Example: Prepare a presentation about renewable energy. I need to compare three sources and explain which situations each one works best for." />
            <div className="char-count">{task.length}/700</div>
            <div className="field-grid"><label><span className="field-label">Task type</span><select value={kind} onChange={e=>setKind(e.target.value)}><option value="school">School assignment</option><option value="general">Everyday task</option></select></label><label><span className="field-label">Target date (optional)</span><input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/></label></div>
            <label className="field-label range-label" htmlFor="minutes">Available work time <strong>{minutes} min</strong></label>
            <input id="minutes" className="range" type="range" min="30" max="240" step="15" value={minutes} onChange={e=>setMinutes(Number(e.target.value))}/>
            {error&&<p className="error" role="alert">{error}</p>}
            <button className="button primary full" type="submit" disabled={isBuilding}>{isBuilding?'Building your plan…':'Build my starter plan'} <Sparkles size={17}/><ArrowRight size={16}/></button>
          </form>
          <div className="privacy-note"><CheckCircle2 size={16}/> Plans stay in this browser. If an AI key is configured by the operator, your task text is sent to that AI provider. No account required.</div>
        </section>
        <section className="panel plan-panel">
          <div className="plan-head"><div><div className="eyebrow">02 · YOUR WORKFLOW</div><h2>{plan ? 'Your next steps' : 'Your plan will appear here'}</h2></div><button className="icon-button" onClick={resetPlan} disabled={!plan} title="Clear plan" aria-label="Clear plan"><RotateCcw size={17}/></button></div>
          {plan ? <>
            <div className="task-title"><span><BookOpen size={16}/>{plan.kind==='school'?'SCHOOL TASK':'EVERYDAY TASK'}</span><h3>{plan.task}</h3>{plan.deadline&&<small><CalendarDays size={14}/> Target date: {plan.deadline}</small>}</div>
            <div className="progress-wrap"><div className="progress-label"><b>Progress</b><strong>{progress.percent}%</strong></div><div className="progress-track"><span style={{width:`${progress.percent}%`}}/></div></div>
            <div className="steps-list">{plan.steps.map((step,index)=><article className={'step-card '+(step.done?'done':'')} key={step.id}>
              <button className="step-check" aria-label={step.done?'Mark step incomplete':'Mark step complete'} onClick={()=>setPlan(p=>({...p,steps:updateStep(p.steps,step.id,{done:!step.done})}))}>{step.done?<Check size={16}/>:<Circle size={17}/>}</button>
              <div className="step-body">{editing===step.id?<><input className="edit-title" autoFocus value={step.title} maxLength={100} onChange={e=>setPlan(p=>({...p,steps:updateStep(p.steps,step.id,{title:e.target.value})}))}/><textarea className="edit-detail" value={step.detail} maxLength={300} rows={2} onChange={e=>setPlan(p=>({...p,steps:updateStep(p.steps,step.id,{detail:e.target.value})}))}/><button className="save-edit" onClick={()=>setEditing(null)}>Done editing</button></>:<><b>{index+1}. {step.title}</b><p>{step.detail}</p></>}</div>
              <div className="step-tools"><span>{step.minutes}m</span><button onClick={()=>setEditing(editing===step.id?null:step.id)} aria-label={`Edit ${step.title}`} title="Edit step"><Edit3 size={15}/></button></div>
            </article>)}</div>
            <div className="plan-disclaimer"><Sparkles size={15}/><p>{plan.note} {plan.mode==='ai'?'AI-assisted draft.':'Template-based draft.'}</p></div>
          </> : <div className="empty-plan"><div><GraduationCap size={30}/></div><h3>Your plan starts with your words.</h3><p>Describe the task on the left, then build a starter plan you can edit and make your own.</p></div>}
        </section>
      </div>
      <footer className="footer"><span>ClearTask · Student-built planning prototype</span><span>Organizes the work. Doesn't do the work.</span></footer>
      {storageNote&&<div className="toast" role="status">{storageNote}</div>}
    </main>
  </div>;
}
