// Talks to the same Apps Script web app as the waitlist (scripts/waitlist-sheet.gs), with the same secret.
export interface OgResult { ok: true; eligible: boolean; rank: number | null; used: boolean }
export type OrderRow = Partial<Record<
  | "order_id" | "created" | "updated" | "status" | "lane" | "email" | "name" | "phone" | "address" | "build_name" | "build_code" | "parts"
  | "parts_aed" | "sourcing_fee_aed" | "build_fee_aed" | "add_ons" | "add_ons_aed" | "og_applied" | "og_discount_aed" | "service_total_aed"
  | "total_aed" | "stripe_session" | "payment_intent" | "prices_checked" | "stripe_fee_est_aed" | "net_service_aed" | "protection_fee_aed",
  string | number | boolean
>> & { order_id: string }

export interface SheetClient {
  ogCheck(email: string): Promise<OgResult>
  upsertOrder(order: OrderRow): Promise<{ ok: true; created: boolean }>
}

export function sheetConfigured(): boolean { return Boolean(process.env.WAITLIST_SHEET_URL && process.env.WAITLIST_SHEET_SECRET) }

async function call(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const url = process.env.WAITLIST_SHEET_URL
  const secret = process.env.WAITLIST_SHEET_SECRET
  if (!url || !secret) throw new Error("sheet not configured")
  // Apps Script cold starts are slow, same 55s budget as app/api/waitlist/route.ts.
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, secret }), signal: AbortSignal.timeout(55000), cache: "no-store" })
  const result = (await response.json()) as Record<string, unknown>
  if (!response.ok || result.ok !== true) throw new Error(String(result.error ?? `HTTP ${response.status}`))
  return result
}

export const sheet: SheetClient = {
  async ogCheck(email) {
    const r = await call({ action: "og_check", email })
    return { ok: true, eligible: r.eligible === true, rank: typeof r.rank === "number" ? r.rank : null, used: r.used === true }
  },
  async upsertOrder(order) {
    const r = await call({ action: "order_upsert", order })
    return { ok: true, created: r.created === true }
  },
}
