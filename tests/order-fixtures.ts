
import type { QuoteCandidate, QuotePart, QuoteResponse, RetailerId } from "../lib/order/types"
import { encodeBuildCode } from "../lib/order/build-code"
import type { SlotCode } from "../lib/order/types"

export const GOLDEN_CODE = "1.WyJNeSBidWlsZCIsW1siQ1BVIiwiYW1hem9uX2FlOkIwQkJIRDVEOFkiLCJub29uOk41MzM0Njg0MEEiXSxbIkNQVV9DT09MRVIiXSxbIkdQVSIsIm1pY3JvbGVzczoxMjM0NTYiXV1d"

export function cand(slot: string, price: number | null, over: Partial<QuoteCandidate> = {}): QuoteCandidate {
  const retailer: RetailerId = over.retailer ?? "amazon_ae"
  return { retailer, retailerSku: `${slot}-sku`, status: "ok", price, inStock: true, url: `https://www.amazon.ae/dp/${slot}`, title: `${slot} part`, lastSeenAt: "2026-10-17T00:00:00Z", ageSeconds: 3600, ...over }
}
export function qpart(slot: string, price: number | null, over: Partial<QuoteCandidate> = {}): QuotePart {
  const c = cand(slot, price, over)
  return { slot, status: c.status, chosen: c, candidates: [c], componentId: "c1", category: "CPU" }
}
export const SLOTS_FULL: SlotCode[] = ["CPU", "CPU_COOLER", "MOTHERBOARD", "RAM", "STORAGE", "GPU", "POWER_SUPPLY", "CASE"]
export const FULL_CODE = encodeBuildCode("Full", SLOTS_FULL.map(s => (s === "CPU_COOLER" ? [s] : [s, `amazon_ae:${s}-sku`])) as Array<[SlotCode, ...string[]]>)
export function fullQuote(prices: Partial<Record<string, number>> = {}, override: Record<string, Partial<QuoteCandidate>> = {}): QuoteResponse {
  return {
    currency: "AED", maxAgeSeconds: 604800, generatedAt: "2026-10-17T01:00:00Z",
    parts: SLOTS_FULL.map(s => s === "CPU_COOLER"
      ? { slot: s, status: "unknown", chosen: null, candidates: [], componentId: null, category: null }
      : qpart(s, prices[s] ?? 1000, override[s] ?? {})),
  }
}
