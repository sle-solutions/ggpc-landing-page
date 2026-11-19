"use client"

import { useEffect, useState } from "react"
import { suggestBuild } from "@/app/builder/actions"
import { Plus, ChevronRight, ChevronDown, ArrowRight } from "lucide-react"
import { PartSprite } from "./part-sprite"
import { WhatsAppMark } from "./retailer-brand"
import { partLabel } from "@/lib/order/part-label"
import { BuilderPicker } from "./builder-picker"
import { allInFils, LOADOUT_TIERS, loadoutAgeSeconds, type Loadout, type LoadoutPart } from "@/lib/order/loadouts"
import { encodeBuildCode } from "@/lib/order/build-code"
import type { CoreSlot } from "@/lib/order/builder-catalog"
import { checkBuild, estimatePower } from "@/lib/pc-engine/shared/compatibility"
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
  const power = estimatePower(normalized)
  const hasPowerParts = !!cpu && normalized.some(p => p.category === "GPU")
  const psu = normalized.find(p => p.category === "POWER_SUPPLY")
  const notes = fit.issues.filter(issue => issue.severity === "info")
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

  async function autoPick(amount: number) {
    if (busy) return
    setBudget(String(amount))
    setNotice("")
    setBusy(true)
    setPicker(null)
    try {
      const result = await suggestBuild(amount)
      if (!result.picked) setNotice(parts.length ? result.error + " Your current parts are still selected." : result.error)
      else {
        setParts(selections(result.picked, result.generatedAt))
        setNotice("")
      }
    } catch { setNotice("Could not load suggested parts. Try again.") }
    finally { setBusy(false) }
  }

  return <div id="loadout-result">
    <div className="studio-shortcuts" role="group" aria-label="Budget shortcuts">
      {LOADOUT_TIERS.map(tier => <button key={tier.id} type="button" disabled={busy}
        aria-pressed={Number(budget) === tier.budgetAed} onClick={() => void autoPick(tier.budgetAed)}>
        <strong>{tier.name}</strong><span>{formatAed(tier.budgetAed * 100)}</span>
      </button>)}
    </div>
    <form className="studio-budget" onSubmit={event => {
      event.preventDefault()
      if (validBudget) void autoPick(Number(budget))
    }}>
      <label htmlFor="pc-budget">Your budget</label>
      <div className="budget-field"><span>AED</span><input id="pc-budget" aria-label="Your total budget (AED)" type="number" inputMode="numeric" min="1" step="1" required disabled={busy} value={budget}
        onChange={e => { setBudget(e.target.value); setNotice("") }} /></div>
      <button className="btn btn-primary studio-suggest" disabled={busy || !validBudget}>{busy ? "Finding parts…" : "Generate build"}</button>
    </form>
    {notice && <p className="studio-notice" role="status">{notice}</p>}
    <div className="studio-layout">
      <section className="studio-components">
        <header><h2>Components</h2><span>{parts.length} selected</span></header>
        <ul>{CORE_SLOTS.map(slot => {
          const part = parts.find(p => p.slot === slot)
          return <li key={slot}>
            <button className="studio-part" disabled={busy} aria-haspopup="dialog" aria-label={(part ? "Swap " : "Choose ") + SLOT_LABELS[slot]} onClick={() => setPicker(slot)}>
              <PartSprite slot={slot} />
              <span className="studio-part-name">{part ? <><small>{SLOT_LABELS[slot]}</small><strong>{partLabel(part)}</strong><small>{RETAILER_NAMES[part.retailer]} · {seenAgo(loadoutAgeSeconds(part.ageSeconds, part.generatedAt, now))}</small></> :
                <><strong>{SLOT_LABELS[slot]}</strong>{slot === "CPU_COOLER" && cpu?.specs.boxedCooler && <small>Stock cooler expected</small>}</>}</span>
              {part && <span className="studio-price">{formatAed(Math.round(part.price * 100))}</span>}
              <span className="studio-affordance">{part ? <ChevronRight size={18} /> : <Plus size={17} />}</span>
            </button>
          </li>
        })}</ul>
      </section>
      <aside className="studio-summary">
        <h2>Build estimate</h2>
        <strong className="studio-total">{parts.length ? formatAed(total.totalFils) : "—"}</strong>
        {parts.length > 0 && <p className="studio-balance" aria-live="polite">{validBudget ? formatAed(Math.abs(balance)) + (balance < 0 ? " over budget" : " under budget") : "Enter a whole AED budget."}</p>}
        <details className="studio-fees"><summary>Price breakdown <ChevronDown size={15}/></summary><dl>
          <div><dt>Selected parts</dt><dd>{formatAed(total.partsFils)}</dd></div>
          <div><dt>{SOURCING_FEE_LABEL}</dt><dd>{formatAed(total.sourcingFils)}</dd></div>
          <div><dt>Assembly</dt><dd>{formatAed(total.buildFils)}</dd></div>
          <div><dt>{PROTECTION_FEE_LABEL}</dt><dd>{formatAed(total.protectionFils)}</dd></div>
        </dl></details>
        {parts.length > 0 && <dl className="studio-power" aria-label="Power estimate">
          <div><dt>Estimated peak draw</dt><dd>{hasPowerParts ? (power.complete ? "≈ " : "At least ") + power.estimatedWattage + " W" : "Add CPU and GPU"}</dd></div>
          <div><dt>Recommended PSU</dt><dd>{hasPowerParts && power.complete ? power.recommendedPsuWattage + " W+" : "Pending specs"}</dd></div>
          {psu?.specs.wattage && <div><dt>Selected PSU</dt><dd>{psu.specs.wattage} W</dd></div>}
        </dl>}
        {parts.length > 0 && <div className="studio-fit">
          {fit.issues.filter(i => i.severity !== "info").map(i => <details key={i.code}><summary>{i.title}</summary><p>{i.message}</p></details>)}
          {fit.status === "ok" && <p>No known conflicts</p>}
          {notes.length > 0 && <details><summary>Fit notes ({notes.length})</summary>
            {notes.map(note => <p key={note.code}>{note.message}</p>)}</details>}
          {needsCooler && <p>Add a CPU cooler.</p>}
        </div>}
        {stale && <p role="status">Refresh expired prices by selecting a recent listing.</p>}
        {!ready && <p className="studio-hint">{!parts.length ? "Choose your first part to see a total." : missing.length ? missing.length + " required " + (missing.length === 1 ? "part" : "parts") + " remaining" : ""}</p>}
        {ready ? <><a className="btn btn-primary studio-order builder-cta" href={'/build/' + code}>Have it built <ArrowRight size={17}/></a>
          {whatsapp && <a className="btn btn-whatsapp builder-whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer"><WhatsAppMark />WhatsApp quote</a>}
          <a className="studio-secondary" href={'/build/' + code + '?lane=b'}>Buy the parts yourself</a></> :
          <button className="btn studio-order" disabled>Have it built <ArrowRight size={17}/></button>}
      </aside>
      {picker && <BuilderPicker slot={picker} installed={normalized} selected={parts.find(p => p.slot === picker)} close={() => setPicker(null)}
        remove={() => { setParts(parts.filter(p => p.slot !== picker)); setPicker(null); setNotice("") }}
        choose={(p, timestamp) => { setParts(previous => [...previous.filter(old => old.slot !== picker), { ...p, generatedAt: timestamp }]); setPicker(null); setNotice("") }} />}
      {ready && <div className="builder-bar">
        <span><small>Build estimate</small><strong>{formatAed(total.totalFils)}</strong></span>
        <div className="builder-bar-actions">
          <a className="btn btn-primary" href={'/build/' + code}>Have it built</a>
          {whatsapp && <a className="btn btn-whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer"><WhatsAppMark />WhatsApp quote</a>}
        </div>
      </div>}
    </div>
  </div>
}
