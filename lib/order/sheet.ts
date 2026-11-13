// Existing secret-authenticated Apps Script transport. No credential is sent to the browser.
export type OrderRow = Partial<Record<
  | "order_id" | "created" | "updated" | "status" | "lane" | "email" | "name" | "phone" | "address" | "build_name" | "build_code" | "parts"
  | "parts_aed" | "sourcing_fee_aed" | "build_fee_aed" | "add_ons" | "add_ons_aed" | "og_applied" | "og_discount_aed" | "service_total_aed"
  | "total_aed" | "stripe_session" | "payment_intent" | "prices_checked" | "stripe_fee_est_aed" | "net_service_aed" | "protection_fee_aed",
  string | number | boolean
>> & { order_id: string }

export interface ClaimRef { orderId: string; intent: string; binding: string }
export interface CheckoutReservation { intent: string; binding: string; email: string; order: OrderRow; ogOrder: OrderRow | null }
export interface SheetClient {
  reserveCheckout(checkout: CheckoutReservation): Promise<{ ok: true; orderId: string; og: boolean }>
  attachCheckout(checkout: ClaimRef & { session: string }): Promise<{ ok: true }>
  transitionCheckout(checkout: ClaimRef & { eventId: string; order: OrderRow }): Promise<{ ok: true }>
  upsertOrder(order: OrderRow): Promise<{ ok: true; created: boolean }>
}

export function sheetConfigured(): boolean { return Boolean(process.env.WAITLIST_SHEET_URL && process.env.WAITLIST_SHEET_SECRET) }

async function call(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const url = process.env.WAITLIST_SHEET_URL, secret = process.env.WAITLIST_SHEET_SECRET
  if (!url || !secret) throw new Error("sheet_unavailable")
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, secret }), signal: AbortSignal.timeout(55000), cache: "no-store" })
  const result = await response.json() as Record<string, unknown>
  if (!response.ok || result.ok !== true) throw new Error(result.error === "below_floor" ? "below_floor" : "sheet_unavailable")
  return result
}

export const sheet: SheetClient = {
  async reserveCheckout(checkout) {
    const r = await call({ action: "checkout_reserve", checkout })
    if (typeof r.orderId !== "string" || !/^GG-[0-9A-HJKMNP-TV-Z]{6}$/.test(r.orderId) || typeof r.og !== "boolean") throw new Error("sheet_unavailable")
    return { ok: true, orderId: r.orderId, og: r.og }
  },
  async attachCheckout(checkout) { await call({ action: "checkout_attach", checkout }); return { ok: true } },
  async transitionCheckout(checkout) { await call({ action: "checkout_transition", checkout }); return { ok: true } },
  async upsertOrder(order) { const r = await call({ action: "order_upsert", order }); return { ok: true, created: r.created === true } },
}
