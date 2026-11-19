"use client"

import { useEffect, useState } from "react"
import { findParts } from "@/app/builder/actions"
import type { CatalogPage, CoreSlot } from "@/lib/order/builder-catalog"
import type { LoadoutPart } from "@/lib/order/loadouts"
import { formatAed, seenAgo } from "@/lib/order/format"
import { RETAILER_NAMES, SLOT_LABELS } from "@/lib/order/types"

export function BuilderPicker({ slot, choose, close }: {
  slot: CoreSlot; choose: (part: LoadoutPart, generatedAt: string) => void; close: () => void
}) {
  const [query, setQuery] = useState("")
  const [request, setRequest] = useState({ search: "", offset: 0 })
  const [page, setPage] = useState<CatalogPage | null>(null)
  const [error, setError] = useState("")
  function browse(search: string, offset: number) {
    setPage(null)
    setError("")
    setRequest({ search, offset })
  }
  useEffect(() => {
    let active = true
    findParts(slot, request.search, request.offset).then(result => {
      if (!active) return
      if ("error" in result) setError(result.error)
      else setPage(result)
    }).catch(() => { if (active) setError("Could not load the catalog. Try again.") })
    return () => { active = false }
  }, [slot, request])
  return <section className="part-picker" aria-label={SLOT_LABELS[slot] + " catalog"}>
    <form onSubmit={e => { e.preventDefault(); browse(query, 0) }}>
      <input autoFocus aria-label={'Search ' + SLOT_LABELS[slot]} placeholder="Search brand or model" maxLength={100} value={query} onChange={e => setQuery(e.target.value)} />
      <button className="btn" type="submit">Search</button>
      <button className="builder-text-button" type="button" onClick={close}>Close</button>
    </form>
    {!page && <p role="status">{error || "Looking up store listings…"}</p>}
    {page && <>
      {!page.parts.length && <p role="status">No recent eligible listings on this page.</p>}
      {page.parts.map(p => <button className="catalog-choice" key={p.componentId} onClick={() => choose(p, page.generatedAt)}>
        <span>{p.name}</span><small>{RETAILER_NAMES[p.retailer]} · {seenAgo(p.ageSeconds)}</small><strong>{formatAed(Math.round(p.price * 100))}</strong>
      </button>)}
      <div className="picker-pages">
        {request.offset > 0 && <button onClick={() => browse(request.search, request.offset - 8)}>Previous results</button>}
        {page.more && <button onClick={() => browse(request.search, request.offset + 8)}>More results</button>}
      </div>
    </>}
  </section>
}
