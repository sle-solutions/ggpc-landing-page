"use client"

import { useEffect, useRef, useState } from "react"
import { Info, Search, X } from "lucide-react"
import { PartSprite } from "./part-sprite"
import { checkBuild } from "@/lib/pc-engine/shared/compatibility"
import { normalizePart } from "@/lib/pc-engine/shared/specs"
import type { NormalizedPart } from "@/lib/pc-engine/shared/types"
import { findParts } from "@/app/builder/actions"
import type { CatalogPage, CoreSlot } from "@/lib/order/builder-catalog"
import type { LoadoutPart } from "@/lib/order/loadouts"
import { partLabel } from "@/lib/order/part-label"
import { cleanTitle, formatAed, seenAgo } from "@/lib/order/format"
import { RETAILER_NAMES, SLOT_LABELS } from "@/lib/order/types"

export function BuilderPicker({ slot, selected, installed, choose, close, remove }: {
  slot: CoreSlot; installed: NormalizedPart[]; selected?: LoadoutPart; choose: (part: LoadoutPart, generatedAt: string) => void; close: () => void; remove: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState("")
  const [offset, setOffset] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [reply, setReply] = useState<{ key: string; data: CatalogPage | { error: string } }>()
  const search = query.trim()
  const key = JSON.stringify([slot, search, offset, attempt])
  const result = reply?.key === key ? reply.data : undefined
  useEffect(() => {
    const panel = dialog.current!
    const previous = document.activeElement
    panel.showModal()
    if (window.matchMedia("(pointer: fine)").matches) panel.querySelector("input")?.focus()
    return () => { panel.close(); if (previous instanceof HTMLElement) previous.focus({ preventScroll: true }) }
  }, [])
  useEffect(() => {
    let active = true
    const timer = setTimeout(async () => {
      try {
        const data = await findParts(slot, search, offset)
        if (active) setReply({ key, data })
      } catch { if (active) setReply({ key, data: { error: "Could not load the catalog." } }) }
    }, search ? 300 : 0)
    return () => { active = false; clearTimeout(timer) }
  }, [slot, search, offset, key])
  return <dialog ref={dialog} className="studio-picker" aria-labelledby="picker-title" onCancel={close}
    onClick={event => { if (event.target === dialog.current) close() }}>
    <section><header><h2 id="picker-title">{SLOT_LABELS[slot]}</h2><button className="picker-close" autoFocus aria-label="Close part picker" onClick={close}><X size={20}/></button></header>
      <label className="picker-search"><Search size={18}/><input type="search" enterKeyHint="search" aria-label={'Search ' + SLOT_LABELS[slot]} placeholder="Search brand or model" maxLength={100} value={query} onChange={e => { setQuery(e.target.value); setOffset(0) }}/></label>
      {selected && <details className="picker-current"><summary>Current selection · {partLabel(selected)}</summary><p>{cleanTitle(selected.title)}</p><button onClick={remove}>Remove part</button></details>}
      <div className="picker-results" aria-busy={!result}>
        {!result ? <p role="status">Looking up parts…</p> : "error" in result ? <p role="status">{result.error} <button onClick={() => setAttempt(attempt + 1)}>Retry</button></p> : <>
          {!result.parts.length && <p role="status">No recent listings here. Try another model{result.more ? " or the next page" : ""}.</p>}
          {result.parts.map(p => {
            const otherParts = installed.filter(part => part.category !== slot)
            const candidate = normalizePart({ title: p.title }, { category: slot })
            const issues = checkBuild([...otherParts, candidate]).issues.filter(issue => issue.parts.includes(slot))
            const conflict = issues.find(issue => issue.severity === "error")
            const warning = issues.find(issue => issue.severity === "warning")
            const label = partLabel(p)
            return <div className="picker-option" key={p.componentId}>
              <button className="catalog-choice" disabled={!!conflict} onClick={() => choose(p, result.generatedAt)}>
                <PartSprite slot={slot} />
                <span className="choice-copy"><b>{label}</b><small>{RETAILER_NAMES[p.retailer]} · {seenAgo(p.ageSeconds)}</small>
                  {(conflict || warning) && <small className="choice-warning">{(conflict || warning)?.title}</small>}
                </span><strong>{formatAed(Math.round(p.price * 100))}</strong>
              </button>
              <details><summary aria-label={"Listing details for " + label} title="Full store listing"><Info size={18}/></summary>
                <p>{cleanTitle(p.title)}</p>{issues.map(issue => <p key={issue.code}>{issue.message}</p>)}</details>
            </div>
          })}
          {(offset > 0 || result.more) && <footer>{offset > 0 && <button onClick={() => setOffset(offset - 8)}>Previous</button>}{result.more && <button onClick={() => setOffset(offset + 8)}>More results</button>}</footer>}
        </>}
      </div>
    </section>
  </dialog>
}
