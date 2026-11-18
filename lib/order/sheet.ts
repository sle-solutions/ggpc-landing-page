import { createHash } from "node:crypto"
// Existing authority only. Never forwards a raw member bearer or a credential-bearing redirect.
export type OrderRow = Partial<Record<
  | "order_id" | "created" | "updated" | "status" | "lane" | "email" | "name" | "phone" | "address" | "build_name" | "build_code" | "parts"
  | "parts_aed" | "sourcing_fee_aed" | "build_fee_aed" | "add_ons" | "add_ons_aed" | "og_applied" | "og_discount_aed" | "service_total_aed"
  | "total_aed" | "stripe_session" | "payment_intent" | "prices_checked" | "stripe_fee_est_aed" | "net_service_aed" | "protection_fee_aed",
  string | number | boolean
>> & { order_id: string }
export const RESERVATION_PROTOCOL = "ggpc-checkout-reservation-v2"
export const RECEIPT_PROTOCOL = "ggpc-checkout-receipt-v1"
export interface ClaimRef { orderId: string; intent: string; binding: string }
export interface CheckoutReservation { intent: string; binding: string; legacyBinding?: string; email: string; order: OrderRow; ogOrder: OrderRow | null; memberCode?: { version: 1; digest: string } | null }
export interface CheckoutReceipt extends ClaimRef { protocol: typeof RECEIPT_PROTOCOL; ok: true; session: string; paymentIntent: string; lane: "A" | "B"; buildCode: string; status: string }
export interface ReceiptRef extends ClaimRef { session: string; paymentIntent: string }
export interface SheetClient {
  reserveCheckout(checkout: CheckoutReservation): Promise<{ ok: true; orderId: string; og: boolean; binding: string }>
  attachCheckout(checkout: ClaimRef & { session: string }): Promise<{ ok: true }>
  transitionCheckout(checkout: ClaimRef & { eventId: string; order: OrderRow }): Promise<{ ok: true }>
  receiptCheckout?(checkout: ReceiptRef): Promise<CheckoutReceipt>
  upsertOrder(order: OrderRow): Promise<{ ok: true; created: boolean }>
}
export function sheetConfigured(): boolean { return Boolean(process.env.WAITLIST_SHEET_URL && process.env.WAITLIST_SHEET_SECRET) }
const failed = (): never => { throw new Error("sheet_unavailable") }
const MAX = 65536
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex")
export const reservationRequestBinding = (checkout: CheckoutReservation) => hash([RESERVATION_PROTOCOL, checkout.intent, checkout.binding, checkout.email, checkout.memberCode ?? null, ...(checkout.legacyBinding === undefined ? [] : [checkout.legacyBinding])])
const exact = (value: unknown, keys: string[]): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).sort().join(",") === keys.slice().sort().join(",")
async function boundedJson(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok || response.status !== 200 || !response.body || Number(response.headers.get("content-length") || 0) > MAX) return failed()
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let length = 0
  try {
    for (;;) { const part = await reader.read(); if (part.done) break; length += part.value.length; if (length > MAX) return failed(); chunks.push(part.value) }
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"))
    if (!value || typeof value !== "object" || Array.isArray(value)) return failed()
    return value as Record<string, unknown>
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
}
async function call(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const url = process.env.WAITLIST_SHEET_URL, secret = process.env.WAITLIST_SHEET_SECRET
  if (!url || !secret) return failed()
  try {
    const target = new URL(url)
    if (target.protocol !== "https:" || target.hostname !== "script.google.com" || target.port || target.username || target.password || target.search || target.hash || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(target.pathname) || target.href !== url) return failed()
    const signal = AbortSignal.timeout(55000)
    let response = await fetch(url, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, secret }), signal, cache: "no-store" })
    if ([302, 303].includes(response.status)) {
      const location = response.headers.get("location")
      if (!location || location.length > MAX) return failed()
      const next = new URL(location), decoded = decodeURIComponent(next.href)
      const checkout = payload.checkout as { email?: unknown } | undefined
      const email = typeof checkout?.email === "string" ? checkout.email : ""
      if (next.protocol !== "https:" || next.hostname !== "script.googleusercontent.com" || next.port || next.username || next.password || next.hash || next.pathname !== "/macros/echo" || decoded.includes("%") || decoded.includes(secret) || decoded.replace(/\+/g, " ").includes(secret) || email && decoded.toLowerCase().includes(email.toLowerCase())) return failed()
      response = await fetch(next.href, { method: "GET", redirect: "error", cache: "no-store", signal })
    }
    const result = await boundedJson(response)
    if (result.ok !== true) throw new Error(result.error === "below_floor" ? "below_floor" : result.error === "member_code_unavailable" ? "member_code_unavailable" : "sheet_unavailable")
    return result
  } catch (error) {
    if (error instanceof Error && ["below_floor", "member_code_unavailable"].includes(error.message)) throw error
    return failed()
  }
}
export const sheet: SheetClient = {
  async reserveCheckout(checkout) {
    const requestBinding = reservationRequestBinding(checkout)
    const r = await call({ action: "checkout_reserve_v2", checkout: { ...checkout, protocol: RESERVATION_PROTOCOL, memberCode: checkout.memberCode ?? null, requestBinding } })
    if (!exact(r, ["ok", "protocol", "intent", "binding", "requestBinding", "orderId", "og", "replayed", "memberCodeMatched"]) || r.protocol !== RESERVATION_PROTOCOL || r.intent !== checkout.intent || r.binding !== checkout.binding && (checkout.legacyBinding === undefined || r.binding !== checkout.legacyBinding || r.replayed !== true) || r.requestBinding !== requestBinding || typeof r.orderId !== "string" || !/^GG-[0-9A-HJKMNP-TV-Z]{6}$/.test(r.orderId) || typeof r.og !== "boolean" || typeof r.replayed !== "boolean" || r.memberCodeMatched !== !!checkout.memberCode || checkout.memberCode && r.og !== true) return failed()
    return { ok: true, orderId: r.orderId, og: r.og, binding: r.binding as string }
  },
  async attachCheckout(checkout) {
    const r = await call({ action: "checkout_attach", checkout })
    if (!exact(r, ["ok", "protocol", "orderId", "intent", "binding", "session"]) || r.protocol !== "ggpc-checkout-attach-v1" || Object.entries(checkout).some(([key, value]) => r[key] !== value)) return failed()
    return { ok: true }
  },
  async transitionCheckout(checkout) {
    const r = await call({ action: "checkout_transition", checkout })
    if (!exact(r, ["ok", "protocol", "orderId", "intent", "binding", "eventId"]) || r.protocol !== "ggpc-checkout-transition-v1" || ["orderId", "intent", "binding", "eventId"].some(key => r[key] !== checkout[key as keyof typeof checkout])) return failed()
    return { ok: true }
  },
  async receiptCheckout(checkout) {
    const r = await call({ action: "checkout_receipt", checkout })
    if (!exact(r, ["ok", "protocol", "orderId", "intent", "binding", "session", "paymentIntent", "lane", "buildCode", "status"]) || r.protocol !== RECEIPT_PROTOCOL || Object.entries(checkout).some(([key, value]) => r[key] !== value) || !["A", "B"].includes(String(r.lane)) || typeof r.buildCode !== "string" || !["authorized", "paid"].includes(String(r.status))) return failed()
    return r as unknown as CheckoutReceipt
  },
  async upsertOrder(order) { const r = await call({ action: "order_upsert", order }); return { ok: true, created: r.created === true } },
}
