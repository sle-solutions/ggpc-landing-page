import { ORDER } from "./config"
import { RETAILER_NAMES, REQUIRED_SLOTS, SLOT_LABELS } from "./types"
import type { Build, Lane, QuotePart, QuoteResponse, SlotCode } from "./types"

type Workshop = typeof ORDER.workshopAddress
export type LaneFailure = "parts_not_ok" | "unknown_parts" | "incomplete" | "no_workshop"
export type LaneStatus = { ok: true } | { ok: false; reason: LaneFailure }

// A skipped cooler is a CPU_COOLER entry with zero candidates; it needs no quote.
export function isSkipped(slot: string, candidateCount: number) { return slot === "CPU_COOLER" && candidateCount === 0 }

export function laneStatus(quote: QuoteResponse, build: Build, lane: Lane, workshop: Workshop = ORDER.workshopAddress): LaneStatus {
  const slots = new Set<SlotCode>(build.parts.map(p => p.slot))
  if (!REQUIRED_SLOTS.every(s => slots.has(s))) return { ok: false, reason: "incomplete" }
  if (lane === "B" && !workshop) return { ok: false, reason: "no_workshop" }
  if (quote.parts.length !== build.parts.length) return { ok: false, reason: "unknown_parts" }
  let notOk = false
  for (let i = 0; i < build.parts.length; i++) {
    const wanted = build.parts[i]
    const part = quote.parts[i]
    if (isSkipped(wanted.slot, wanted.candidates.length)) continue
    if (part.slot !== wanted.slot || !part.chosen || part.status === "unknown") return { ok: false, reason: "unknown_parts" }
    if (lane === "B") { if (!part.chosen.url) return { ok: false, reason: "unknown_parts" } } else if (part.status !== "ok" || part.chosen.status !== "ok" || part.chosen.price === null) notOk = true
  }
  return notOk ? { ok: false, reason: "parts_not_ok" } : { ok: true }
}

export interface TotalsLine { name: string; description?: string; amountFils: number }
export interface Totals {
  lane: Lane
  partsFils: number
  sourcingFils: number
  buildFils: number
  serviceFils: number
  ogDiscountFils: number
  addOnsFils: number
  totalFils: number
  addOns: Array<{ id: string; name: string; priceFils: number }>
  lines: TotalsLine[] // Stripe line items, one unit each, already net of any OG discount
}

export function computeTotals(input: { lane: Lane; quote: QuoteResponse; build?: Build; addOnIds: string[]; og: boolean }): Totals | { error: "below_floor" } {
  const { lane, quote, og } = input
  const partLines: TotalsLine[] = []
  let partsFils = 0
  if (lane === "A") {
    for (const part of quote.parts) {
      if (!part.chosen || part.chosen.price === null) continue
      const fils = Math.round(part.chosen.price * 100)
      partsFils += fils
      partLines.push({ name: partLineName(part), amountFils: fils })
    }
  }
  const sourcingFils = Math.round(partsFils * ORDER.sourcingFeeRate)
  const buildFils = ORDER.buildFeeFils
  const serviceFils = sourcingFils + buildFils
  const ogDiscountFils = og ? Math.round(serviceFils * ORDER.ogDiscountRate) : 0
  if (serviceFils - ogDiscountFils < ORDER.labourFloorFils) return { error: "below_floor" }

  const chosenAddOns = ORDER.addOns.filter((a): a is { id: string; name: string; priceFils: number } => a.priceFils !== null && a.priceFils > 0 && input.addOnIds.includes(a.id))
  const addOnsFils = chosenAddOns.reduce((sum, a) => sum + a.priceFils, 0)

  // Spread the discount over the two service lines so the Stripe lines sum to the total without a coupon.
  const sourcingDiscount = og ? Math.round(sourcingFils * ORDER.ogDiscountRate) : 0
  const buildDiscount = ogDiscountFils - sourcingDiscount
  const note = og ? ORDER.perkCopy : undefined
  const lines: TotalsLine[] = [...partLines]
  if (lane === "A" && sourcingFils > 0) lines.push({ name: "Sourcing fee (8% of parts)", description: note, amountFils: sourcingFils - sourcingDiscount })
  lines.push({ name: "Build fee", description: note, amountFils: buildFils - buildDiscount })
  for (const a of chosenAddOns) lines.push({ name: a.name, amountFils: a.priceFils })

  return { lane, partsFils, sourcingFils, buildFils, serviceFils, ogDiscountFils, addOnsFils, totalFils: partsFils + serviceFils - ogDiscountFils + addOnsFils, addOns: chosenAddOns, lines }
}

export function partLineName(part: QuotePart): string {
  const c = part.chosen
  const label = SLOT_LABELS[part.slot as SlotCode] ?? part.slot
  const title = (c?.title ?? "Part").replace(/\s+/g, " ").trim().slice(0, 150)
  return `${label}: ${title} (${c ? RETAILER_NAMES[c.retailer] : "store"})`
}
