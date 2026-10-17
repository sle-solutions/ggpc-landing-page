import { RETAILER_NAMES, SLOT_LABELS } from "./types"
import type { Lane, QuoteResponse, SlotCode } from "./types"
import type { Totals } from "./pricing"
import { filsToAed, seenAgo } from "./format"
import type { OrderRow } from "./sheet"

const ID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ" // Crockford base32
export function newOrderId(randomInt: (max: number) => number): string {
  let id = "GG-"
  for (let i = 0; i < 6; i++) id += ID_ALPHABET[randomInt(ID_ALPHABET.length)]
  return id
}
export const ORDER_ID_PATTERN = /^GG-[0-9A-HJKMNP-TV-Z]{6}$/

export function partsText(quote: QuoteResponse): string {
  return quote.parts.map(p => {
    const c = p.chosen
    if (!c) return `${SLOT_LABELS[p.slot as SlotCode] ?? p.slot} | skipped`
    const price = c.price === null ? "no price" : `AED ${c.price.toFixed(2)}`
    return [SLOT_LABELS[p.slot as SlotCode] ?? p.slot, RETAILER_NAMES[c.retailer], c.retailerSku, price, seenAgo(c.ageSeconds), c.url ?? ""].join(" | ")
  }).join("\n")
}

export function checkoutRow(i: { orderId: string; lane: Lane; email: string; buildName: string; code: string; quote: QuoteResponse; totals: Totals; og: boolean; now: Date }): OrderRow {
  return {
    order_id: i.orderId,
    created: i.now.toISOString(),
    status: "checkout_started",
    lane: i.lane,
    email: i.email,
    build_name: i.buildName,
    build_code: i.code,
    parts: partsText(i.quote),
    parts_aed: filsToAed(i.totals.partsFils),
    sourcing_fee_aed: filsToAed(i.totals.sourcingFils),
    build_fee_aed: filsToAed(i.totals.buildFils),
    add_ons: i.totals.addOns.map(a => a.name).join(", "),
    add_ons_aed: filsToAed(i.totals.addOnsFils),
    og_applied: i.og,
    og_discount_aed: filsToAed(i.totals.ogDiscountFils),
    service_total_aed: filsToAed(i.totals.serviceFils - i.totals.ogDiscountFils),
    total_aed: filsToAed(i.totals.totalFils),
    prices_checked: i.quote.generatedAt,
  }
}
