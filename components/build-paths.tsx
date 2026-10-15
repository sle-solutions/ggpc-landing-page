"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Glyph, Sprite } from "@/components/pixel"
import { assembly, assemblyModes, budgetIcons, budgets, goals, useBuildBrief } from "./build-brief"

const steps = ["Class", "Budget", "Builder"]

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
  const completed = values.filter(Boolean).length
  const goal = brief.goal ? goals[brief.goal] : null
  const ready = completed === 3
  const left = 3 - completed

  return (
    <section id="quest" className="quest" aria-labelledby="quest-heading">
      <div className="page-width">
        <div className="section-head">
          <h2 id="quest-heading">Quest: your first build.</h2>
          <p>Three quick picks. Finish the quest and your build brief joins the waitlist with you. Just looking around? Skip it and sign up anyway.</p>
        </div>
        <div className="quest-window frame">
          <div className="quest-log">
            <div className="quest-top">
              <nav className="quest-steps" aria-label="Build quest steps">
                {steps.map((label, i) => (
                  <button key={label} type="button" aria-current={step === i ? "step" : undefined} aria-controls={`${uid}-step-${i}`} onClick={() => setStep(i)} className={`quest-step${values[i] ? " is-complete" : ""}${step === i ? " is-current" : ""}`}>
                    <span className="step-box" aria-hidden="true">{values[i] ? <Glyph name="check" size={16} /> : i + 1}</span>{label}
                  </button>
                ))}
              </nav>
              <p className="quest-meter"><span className="meter-bar" aria-hidden="true">{[0, 1, 2].map(i => <span key={i} className={i < completed ? "is-filled" : undefined} />)}</span><span className="quest-count">{completed}/3 picks</span></p>
            </div>
            <div className="quest-choices" ref={panel}>
              <fieldset id={`${uid}-step-0`} hidden={step !== 0}>
                <legend tabIndex={-1}>What is your PC for?</legend>
                <div className="quest-options">
                  {Object.entries(goals).map(([value, item]) => (
                    <label className={`quest-option${brief.goal === value ? " is-selected" : ""}`} key={value}>
                      <input type="radio" name={`${uid}-goal`} checked={brief.goal === value} onChange={() => choose("goal", value as keyof typeof goals)} />
                      <span className="option-icon"><Glyph name={item.icon} size={32} /></span>
                      <span className="option-text"><span className="option-role">{item.role}</span><span className="option-label">{item.label}</span></span>
                      <span className="option-check"><Glyph name="check" size={16} /></span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset id={`${uid}-step-1`} hidden={step !== 1}>
                <legend tabIndex={-1}>What is your parts budget?</legend>
                <div className="quest-options quest-options-budget">
                  {Object.entries(budgets).map(([value, label]) => (
                    <label className={`quest-option${brief.budget === value ? " is-selected" : ""}`} key={value}>
                      <input type="radio" name={`${uid}-budget`} checked={brief.budget === value} onChange={() => choose("budget", value as keyof typeof budgets)} />
                      <span className="option-icon option-icon-gold"><Glyph name={budgetIcons[value as keyof typeof budgets]} size={32} /></span>
                      <span className="option-text"><span className="option-label">{label}</span></span>
                      <span className="option-check"><Glyph name="check" size={16} /></span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset id={`${uid}-step-2`} hidden={step !== 2}>
                <legend tabIndex={-1}>Who is building it?</legend>
                <div className="quest-options">
                  {Object.entries(assembly).map(([value, label]) => (
                    <label className={`quest-option${brief.path === value ? " is-selected" : ""}`} key={value}>
                      <input type="radio" name={`${uid}-path`} checked={brief.path === value} onChange={() => choose("path", value as keyof typeof assembly)} />
                      <span className="option-icon"><Glyph name={assemblyModes[value as keyof typeof assembly].icon} size={32} /></span>
                      <span className="option-text"><span className="option-role">{assemblyModes[value as keyof typeof assembly].mode}</span><span className="option-label">{label}</span></span>
                      <span className="option-check"><Glyph name="check" size={16} /></span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="quest-feedback" role="status" aria-live="polite" aria-atomic="true">
                {ready
                  ? <p className="quest-unlocked"><Glyph name="trophy" size={16} /> Quest complete. Build brief unlocked.</p>
                  : <p className="quest-hint">{completed === 0 ? "Your first move: pick your class." : `${left} ${left === 1 ? "pick" : "picks"} left to finish the quest.`}</p>}
              </div>
              <div className="quest-controls">
                {step > 0 && <button type="button" className="btn btn-ghost quest-back" onClick={() => setStep(step - 1)}><Glyph name="arrowLeft" size={16} /><span>Back</span></button>}
                {step < 2 && <button type="button" className="btn btn-primary" disabled={!values[step]} onClick={() => setStep(step + 1)}><span>Next: {step === 0 ? "budget" : "builder"}</span><Glyph name="arrowRight" size={16} /></button>}
                {step === 2 && <a href="#closing-signup" className="btn btn-primary">{ready ? <><span className="cta-long">Join with my build brief</span><span className="cta-short">Join with my brief</span></> : <span>Join the waitlist</span>}<Glyph name="arrowRight" size={16} /></a>}
              </div>
              <div className="quest-aside">
                <a className="text-link quest-skip" href="#closing-signup">Skip the quest and join</a>
                {completed > 0 && <button type="button" className="text-link quest-reset" onClick={restart}><Glyph name="reset" size={16} /> Start again</button>}
              </div>
            </div>
          </div>
          <div className={`quest-reward${ready ? " is-ready" : ""}`}>
            <p className="reward-heading">Quest reward</p>
            <div className="reward-slot">
              <Sprite name="brief" scale={4} />
              {!ready && <span className="reward-lock" aria-hidden="true">?</span>}
            </div>
            <div className="reward-tip">
              <p className="tip-name">{goal ? `${goal.role} build brief` : "Build brief"}</p>
              <p className="tip-type">Quest reward <span aria-hidden="true">·</span> {ready ? "Unlocked" : "Locked"}</p>
              <dl className="reward-stats">
                <div><dt>Mission</dt><dd>{goal?.label ?? "Pick your class"}</dd></div>
                <div><dt>Budget</dt><dd>{brief.budget ? budgets[brief.budget] : "Set your budget"}</dd></div>
                <div><dt>Build</dt><dd>{brief.path ? assembly[brief.path] : "Choose who builds it"}</dd></div>
              </dl>
              {goal && ready && (
                <div className="reward-advice">
                  <p className="advice-title">{goal.title}</p>
                  <p>{goal.advice}</p>
                  <ul>{goal.focus.map(point => <li key={point}><Glyph name="check" size={16} />{point}</li>)}</ul>
                </div>
              )}
              {brief.path === "service" && <p className="reward-service">Our planned build service covers parts, assembly, testing and delivery.</p>}
              <p className="reward-note">{ready ? "Your brief joins the waitlist with your signup." : "Optional. A starting point, not a parts recommendation."}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
