"use client"

import { useEffect, useId, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Gamepad2, RotateCcw } from "lucide-react"
import { assembly, budgets, goals, useBuildBrief } from "./build-brief"

export function BuildPaths() {
  const { brief, choose, reset } = useBuildBrief()
  const uid = useId()
  const [step, setStep] = useState(0)
  const panel = useRef<HTMLDivElement>(null)
  const previousStep = useRef(step)
  useEffect(() => {
    if (previousStep.current !== step) {
      previousStep.current = step
      panel.current?.querySelector<HTMLElement>("fieldset:not([hidden]) legend")?.focus()
    }
  }, [step])
  const values = [brief.goal, brief.budget, brief.path]
  function restart() { reset(); setStep(0); if (step === 0) panel.current?.querySelector<HTMLElement>("fieldset:not([hidden]) legend")?.focus() }
  const completed = Object.values(brief).filter(Boolean).length
  const goal = brief.goal ? goals[brief.goal] : null
  const ready = completed === 3
  return (
    <section id="build-quest" className="paths-section page-width" aria-labelledby="paths-heading">
      <div className="paths-heading">
        <h2 id="paths-heading">Choose your<br />build quest.</h2>
        <p>Three quick picks to shape your first PC. Just exploring? You can join the waitlist without playing.</p>
      </div>
      <div className="quest-progress">
        <nav className="quest-slots" aria-label="Build quest steps">{["Mission", "Budget", "Assembly"].map((label, i) => <button key={label} type="button" aria-current={step === i ? "step" : undefined} aria-controls={`${uid}-step-${i}`} onClick={() => setStep(i)} className={`${values[i] ? "is-complete" : ""}${step === i ? " is-current" : ""}`}><span aria-hidden="true">{values[i] ? <Check size={16} /> : i + 1}</span>{label}</button>)}</nav>
        <span className="quest-count">{completed}/3 choices made</span>
        {completed > 0 && <button type="button" className="quest-reset" onClick={restart}><RotateCcw size={14} aria-hidden="true" /> Start again</button>}
      </div>
      <div className="quest-layout">
        <div className="quest-choices" ref={panel}>
          <fieldset id={`${uid}-step-0`} hidden={step !== 0}><legend tabIndex={-1}><span>1</span> What is your PC for?</legend><div className="quest-options">
            {Object.entries(goals).map(([value, item]) => <label className={`quest-option${brief.goal === value ? " is-selected" : ""}`} key={value}><input type="radio" name={`${uid}-goal`} checked={brief.goal === value} onChange={() => choose("goal", value as keyof typeof goals)} /><span>{item.label}</span><Check size={16} aria-hidden="true" /></label>)}
          </div></fieldset>
          <fieldset id={`${uid}-step-1`} hidden={step !== 1}><legend tabIndex={-1}><span>2</span> What is your parts budget?</legend><div className="quest-options quest-budget-options">
            {Object.entries(budgets).map(([value, label]) => <label className={`quest-option${brief.budget === value ? " is-selected" : ""}`} key={value}><input type="radio" name={`${uid}-budget`} checked={brief.budget === value} onChange={() => choose("budget", value as keyof typeof budgets)} /><span>{label}</span><Check size={16} aria-hidden="true" /></label>)}
          </div></fieldset>
          <fieldset id={`${uid}-step-2`} hidden={step !== 2}><legend tabIndex={-1}><span>3</span> Who is building it?</legend><div className="quest-options">
            {Object.entries(assembly).map(([value, label]) => <label className={`quest-option${brief.path === value ? " is-selected" : ""}`} key={value}><input type="radio" name={`${uid}-path`} checked={brief.path === value} onChange={() => choose("path", value as keyof typeof assembly)} /><span>{label}</span><Check size={16} aria-hidden="true" /></label>)}
          </div></fieldset>
          <div className="quest-feedback" role="status" aria-live="polite" aria-atomic="true">
            {ready ? <p className="quest-unlocked"><Check size={18} aria-hidden="true" /> Build brief unlocked</p> : <p className="quest-hint">{completed === 0 ? "Your first move: choose what your PC is for." : `${3 - completed} ${completed === 2 ? "choice" : "choices"} left to complete your brief.`}</p>}
          </div>
          <div className="quest-controls">
            {step > 0 && <button type="button" className="quest-back" onClick={() => setStep(step - 1)}><ArrowLeft size={17} aria-hidden="true" /> Back</button>}
            {step < 2 && <button type="button" className="button-primary" disabled={!values[step]} onClick={() => setStep(step + 1)}>Next: {step === 0 ? "budget" : "assembly"}<ArrowRight size={17} aria-hidden="true" /></button>}
            {step === 2 && <a href="#closing-signup" className="button-primary">{ready ? "Join with my build brief" : "Join the waitlist"}<ArrowUpRight size={17} aria-hidden="true" /></a>}
          </div>
          <a className="quest-skip" href="#closing-signup">Skip the quest and join</a>
        </div>
        <div className={`quest-result${ready ? " is-ready" : ""}`}>
          <div className="quest-result-title"><Gamepad2 size={30} aria-hidden="true" /><h3>Your build brief</h3></div>
          <dl className="quest-summary">
            <div><dt>Mission</dt><dd>{goal?.label ?? "Pick what you want to play"}</dd></div>
            <div><dt>Budget</dt><dd>{brief.budget ? budgets[brief.budget] : "Set your budget"}</dd></div>
            <div><dt>Assembly</dt><dd>{brief.path ? assembly[brief.path] : "Choose your approach"}</dd></div>
          </dl>
          {goal && ready && <div className="quest-advice"><h4>{goal.title}</h4><p>{goal.advice}</p><ul>{goal.focus.map(point => <li key={point}><Check size={15} aria-hidden="true" />{point}</li>)}</ul></div>}
          {brief.path === "service" && <p className="quest-service-note">Our planned build service covers parts, assembly, testing, and delivery.</p>}
          <p className="quest-footnote">{ready ? "Your choices will be included with your signup." : "Optional. This is a starting point, not a parts recommendation."}</p>
        </div>
      </div>
    </section>
  )
}
