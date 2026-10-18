"use client"

import { useState } from "react"
import type { FormEvent, ReactNode } from "react"
import Link from "next/link"

const parts = ["CPU", "Motherboard", "Memory", "Graphics card", "Storage", "Power supply", "Case / cooling"]

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`qa-field ${className}`}><span>{label}</span>{children}</label>
}

function Check({ children }: { children: ReactNode }) {
  return <label className="qa-check"><input type="checkbox" /> <span>{children}</span></label>
}

function growTextarea(event: FormEvent<HTMLTextAreaElement>) {
  const field = event.currentTarget
  field.style.height = "auto"
  field.style.height = `${field.scrollHeight}px`
}

export function QaChecklist() {
  const [printed, setPrinted] = useState(false)

  function printChecklist() {
    setPrinted(false)
    window.print()
    window.setTimeout(() => setPrinted(true), 300)
  }

  return (
    <main id="main-content" className="qa-page">
      <div className="qa-width">
        <header className="qa-header">
          <Link className="qa-home" href="/">GG PC</Link>
          <span className="qa-tag">WORKSHOP SHEET</span>
        </header>
        <div className="qa-title-row">
          <div>
            <h1>Build QA checklist</h1>
            <p>Record the checks for one order, then print or save this sheet as a PDF.</p>
          </div>
          <button className="btn btn-primary qa-print" type="button" onClick={printChecklist}>Print / save PDF</button>
        </div>
        <p className="qa-local-note"><strong>Local form:</strong> this page does not send or save what you enter. It is publicly accessible, not a private or secure record. Do not enter a customer&apos;s name, address, phone number or other personal details. Keep photo files and their folder private; paste only a private evidence link here.</p>

        <section className="qa-panel frame" aria-labelledby="qa-order-heading">
          <h2 id="qa-order-heading">Order record</h2>
          <div className="qa-grid qa-order-grid">
            <Field label="Order ID"><input autoComplete="off" maxLength={40} /></Field>
            <Field label="Lane"><select defaultValue=""><option value="" disabled>Select lane</option><option>Build it for me</option><option>I buy, you build</option></select></Field>
            <Field label="Inspector"><input autoComplete="off" maxLength={80} /></Field>
            <Field label="Inspection date"><input type="date" /></Field>
            <Field label="QA status"><select defaultValue=""><option value="" disabled>Select status</option><option>In progress</option><option>Hold</option><option>Ready for handover</option></select></Field>
          </div>
        </section>

        <section className="qa-panel frame" aria-labelledby="qa-parts-heading">
          <h2 id="qa-parts-heading">Parts and references</h2>
          <p className="qa-help">Record model, serial and receipt or order reference where available. Do not include a customer name or contact details.</p>
          <div className="qa-parts-head" aria-hidden="true"><span>Part</span><span>Model / serial / receipt reference</span></div>
          <div className="qa-parts-list">{parts.map(part => <Field key={part} label={part}><textarea rows={1} autoComplete="off" maxLength={180} onInput={growTextarea} /></Field>)}</div>
        </section>

        <section className="qa-panel frame" aria-labelledby="qa-physical-heading">
          <h2 id="qa-physical-heading">Assembly and first boot</h2>
          <div className="qa-checks">
            <Check>Board, CPU cooler and graphics card are seated.</Check>
            <Check>Power and data cables are connected and clear of fans.</Check>
            <Check>Fans and case airflow are unobstructed.</Check>
            <Check>System reaches BIOS and detects the installed parts.</Check>
            <Check>Memory profile setting and displayed speed are recorded below.</Check>
          </div>
          <div className="qa-grid qa-detail-grid">
            <Field label="BIOS version"><input autoComplete="off" maxLength={80} /></Field>
            <Field label="Memory profile (for example, XMP / EXPO / off)"><input autoComplete="off" maxLength={80} /></Field>
            <Field label="Memory speed shown"><input autoComplete="off" maxLength={80} /></Field>
          </div>
        </section>

        <section className="qa-panel frame" aria-labelledby="qa-stress-heading">
          <h2 id="qa-stress-heading">30-minute stress test</h2>
          <p className="qa-help">Record the tool and actual start and finish times. Leave the result blank until the run is complete and observed. If it is not run or has an issue, mark Hold and add a note.</p>
          <div className="qa-grid qa-detail-grid">
            <Field label="Test tool"><input autoComplete="off" maxLength={100} /></Field>
            <Field label="Start time"><input type="time" /></Field>
            <Field label="End time"><input type="time" /></Field>
            <Field label="Observed duration"><input inputMode="numeric" maxLength={20} aria-label="Observed duration in minutes" /></Field>
            <Field label="Result"><select defaultValue=""><option value="" disabled>Select after run</option><option>Pass</option><option>Issue found</option><option>Not run</option></select></Field>
            <Field label="Peak temperature and component"><input autoComplete="off" maxLength={120} /></Field>
            <Field label="Other readings / observations" className="qa-wide"><textarea rows={3} maxLength={500} onInput={growTextarea} /></Field>
          </div>
        </section>

        <section className="qa-panel frame" aria-labelledby="qa-evidence-heading">
          <h2 id="qa-evidence-heading">Photo evidence</h2>
          <p className="qa-help">Take clear photos of the inside of the finished build. Store them in a private folder with access limited to the team and paste its private link below. There is no upload on this page.</p>
          <div className="qa-checks qa-photo-checks">
            <Check>Full interior view</Check><Check>Power and motherboard connections</Check><Check>Memory and graphics card installed</Check>
          </div>
          <Field label="Private evidence folder link"><textarea aria-label="Private evidence folder link" rows={2} autoComplete="off" maxLength={500} spellCheck={false} onInput={growTextarea} /></Field>
        </section>

        <section className="qa-panel frame" aria-labelledby="qa-handover-heading">
          <h2 id="qa-handover-heading">Handover</h2>
          <div className="qa-checks">
            <Check>Build is powered down and ready for handover.</Check>
            <Check>Photos and checklist are stored in the private order folder.</Check>
            <Check>Build labour has been explained as covered by the two-year labour warranty; part warranties remain with each store and manufacturer.</Check>
          </div>
          <div className="qa-grid qa-detail-grid">
            <Field label="Handover date"><input type="date" /></Field>
            <Field label="Inspector sign-off"><input autoComplete="off" maxLength={80} /></Field>
            <Field label="Handover notes" className="qa-wide"><textarea rows={3} maxLength={500} onInput={growTextarea} /></Field>
          </div>
          <p className="qa-help">Record the work observed. This sheet does not certify a build automatically. If any required check is incomplete or an issue is found, leave the order on Hold and record what needs attention.</p>
        </section>

        <footer className="qa-footer">
          <button className="btn btn-primary qa-print qa-screen-only" type="button" onClick={printChecklist}>Print / save PDF</button>
          {printed ? <span className="qa-print-status" role="status">Print dialog opened. Choose Save as PDF to keep a copy.</span> : null}
        </footer>
      </div>
    </main>
  )
}
