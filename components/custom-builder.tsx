"use client"

import { useEffect, useState, type FormEvent } from "react"
import { suggestBuild } from "@/app/builder/actions"
import { BuilderPicker } from "./builder-picker"
import { allInFils, loadoutAgeSeconds, type Loadout, type LoadoutPart } from "@/lib/order/loadouts"
import { encodeBuildCode } from "@/lib/order/build-code"
import type { CoreSlot } from "@/lib/order/builder-catalog"
import { checkBuild } from "@/lib/pc-engine/shared/compatibility"
import { normalizePart } from "@/lib/pc-engine/shared/specs"
import { formatAed, seenAgo } from "@/lib/order/format"
import { ORDER, PROTECTION_FEE_LABEL, SOURCING_FEE_LABEL } from "@/lib/order/config"
import { CORE_SLOTS, REQUIRED_SLOTS, RETAILER_NAMES, SLOT_LABELS, type SlotCode } from "@/lib/order/types"
import { configuredWhatsAppNumber, buildWhatsAppQuoteUrl } from "@/lib/order/whatsapp"

type Selection = LoadoutPart & { generatedAt: string }
function selections(loadout: Loadout | null, generatedAt: string): Selection[] {
  return loadout?.parts.map(part => ({ ...part, generatedAt })) ?? []
}

export function CustomBuilder({ initialBudget, initialPick, generatedAt, initialNotice }: {
  initialBudget: number; initialPick: Loadout | null; generatedAt: string; initialNotice: string
}) {
  const [budget, setBudget] = useState(String(initialBudget))
  const [parts, setParts] = useState(() => selections(initialPick, generatedAt))
  const [picker, setPicker] = useState<CoreSlot | null>(null)
  const [notice, setNotice] = useState(initialNotice)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])
  const total = allInFils(parts.reduce((sum, part) => sum + Math.round(part.price * 100), 0) / 100)
  const validBudget = /^\d+$/.test(budget) && Number.isSafeInteger(Number(budget) * 100) && Number(budget) > 0
  const balance = Number(budget) * 100 - total.totalFils
  const normalized = parts.flatMap(p => p.slot === "EXTRA" ? [] : [normalizePart({ title: p.title }, { category: p.slot })])
  const fit = checkBuild(normalized)
  const cpu = normalized.find(p => p.category === "CPU")
  const needsCooler = cpu && !cpu.specs.boxedCooler && !parts.some(p => p.slot === "CPU_COOLER")
  const missing = REQUIRED_SLOTS.filter(slot => !parts.some(p => p.slot === slot))
  const stale = parts.some(p => (loadoutAgeSeconds(p.ageSeconds, p.generatedAt, now) ?? Infinity) > ORDER.maxPriceAgeSeconds)
  const ready = validBudget && !missing.length && !needsCooler && fit.status !== "error" && !stale && !busy
  const entries: [SlotCode, ...string[]][] = CORE_SLOTS.map(slot => {
    const p = parts.find(p => p.slot === slot)
    return p ? [slot, p.retailer + ":" + p.retailerSku, ...p.alternates.map(a => a.retailer + ":" + a.retailerSku)] : [slot]
  })
  const name = "My custom PC"
  const code = ready ? encodeBuildCode(name, entries) : ""
  const whatsapp = ready && buildWhatsAppQuoteUrl({ number: configuredWhatsAppNumber(), buildName: name, code, totalFils: total.totalFils })

  async function autoPick(e: FormEvent) {
    e.preventDefault()
    if (!validBudget || busy) return
    setBusy(true)
    setPicker(null)
    try {
      const result = await suggestBuild(Number(budget))
      if (!result.picked) setNotice(result.error)
      else {
        setParts(selections(result.picked, result.generatedAt))
        setNotice("Suggested parts added. You can swap any part below.")
      }
    } catch { setNotice("Could not load suggested parts. Try again.") }
    finally { setBusy(false) }
  }

  return <div id="loadout-result">
    <form className="builder-budget" onSubmit={autoPick}>
      <label>Your total budget (AED)<input type="number" inputMode="numeric" min="1" step="1" required disabled={busy} value={budget}
        onChange={e => { setBudget(e.target.value); setNotice("") }} /></label>
      <button className="btn" disabled={busy || !validBudget}>{busy ? "Finding parts…" : parts.length ? "Replace with suggested parts" : "Suggest parts for my budget"}</button>
    </form>
    {notice && <p className="order-note order-banner" role="status">{notice}</p>}
    <div className="order-grid builder-grid">
      <section className="order-parts frame">
        <h2 className="order-h2">Your parts</h2>
        <ul className="order-list">{CORE_SLOTS.map(slot => {
          const part = parts.find(p => p.slot === slot)
          return <li className="editable-slot" key={slot}>
            <div className="slot-description"><span className="order-slot">{SLOT_LABELS[slot]}</span>
              {part ? <><strong>{part.name}</strong><small>{RETAILER_NAMES[part.retailer]} · {seenAgo(loadoutAgeSeconds(part.ageSeconds, part.generatedAt, now))}</small></> :
                <span className="order-muted">{slot === "CPU_COOLER" && cpu?.specs.boxedCooler ? "Stock cooler expected. Confirm it comes with the CPU." : "Choose a part"}</span>}
            </div>
            <div className="slot-actions">{part && <strong>{formatAed(Math.round(part.price * 100))}</strong>}
              <button disabled={busy} aria-expanded={picker === slot} aria-label={(part ? "Swap " : "Choose ") + SLOT_LABELS[slot]} onClick={() => setPicker(picker === slot ? null : slot)}>{part ? "Swap" : "Choose"}</button>
              {part && <button disabled={busy} aria-label={"Remove " + SLOT_LABELS[slot]} onClick={() => { setParts(parts.filter(p => p.slot !== slot)); setNotice(""); setPicker(null) }}>Remove</button>}
            </div>
            {picker === slot && <BuilderPicker slot={slot} close={() => setPicker(null)} choose={(p, timestamp) => {
              setParts(previous => [...previous.filter(old => old.slot !== slot), { ...p, generatedAt: timestamp }])
              setPicker(null); setNotice("")
            }} />}
          </li>
        })}</ul>
      </section>
      <aside className="order-panel frame">
        <h2 className="order-h2">Build estimate</h2>
        <dl className="order-totals">
          <div><dt>Selected parts</dt><dd>{formatAed(total.partsFils)}</dd></div>
          <div><dt>{SOURCING_FEE_LABEL}</dt><dd>{formatAed(total.sourcingFils)}</dd></div>
          <div><dt>Build fee</dt><dd>{formatAed(total.buildFils)}</dd></div>
          <div><dt>{PROTECTION_FEE_LABEL}</dt><dd>{formatAed(total.protectionFils)}</dd></div>
          <div className="order-total-row"><dt>Estimated total</dt><dd>{formatAed(total.totalFils)}</dd></div>
        </dl>
        <p className="order-hint" aria-live="polite">{validBudget ? formatAed(Math.abs(balance)) + (balance < 0 ? " over budget" : " left in your budget") : "Enter a positive whole AED budget."}</p>
        {parts.length > 0 && <section className="builder-checks"><h3>Compatibility</h3>
          {fit.issues.filter(i => i.severity !== "info").map(i => <p key={i.code}>{i.title}. {i.message}</p>)}
          {fit.status === "ok" && <p>No conflicts found in the available specs.</p>}
          {needsCooler && <p>Choose a CPU cooler for this processor.</p>}
        </section>}
        {missing.length > 0 && <p className="order-hint">Still needed: {missing.map(slot => SLOT_LABELS[slot]).join(", ")}.</p>}
        {stale && <p role="status">One or more prices have expired. Choose a recent listing for those parts.</p>}
        {ready ? <><a className="btn btn-primary builder-cta" href={'/build/' + code}>Have it built</a>
          {whatsapp && <a className="btn btn-whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer">Get a quote on WhatsApp</a>}
          <a className="builder-alt" href={'/build/' + code + '?lane=b'}>Buy the parts yourself</a></> :
          <button className="btn builder-cta" disabled>Have it built</button>}
      </aside>
      {ready && <div className="builder-bar">
        <span><small>Build estimate</small><strong>{formatAed(total.totalFils)}</strong></span>
        <div className="builder-bar-actions">
          <a className="btn btn-primary" href={'/build/' + code}>Have it built</a>
          {whatsapp && <a className="btn btn-whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp quote</a>}
        </div>
      </div>}
    </div>
  </div>
}
