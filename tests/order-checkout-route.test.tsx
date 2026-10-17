import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { handleCheckout } from "../lib/order/checkout"
import type { CheckoutDeps } from "../lib/order/checkout"
import { stripeIntegrationId } from "../lib/order/config"
import { POST } from "../app/api/order/checkout/route"
import { FULL_CODE, fullQuote } from "./order-fixtures"

const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch; delete process.env.STRIPE_SECRET_KEY; delete process.env.WAITLIST_SHEET_URL })

function req(body: unknown) { return new Request("http://localhost/api/order/checkout", { method: "POST", body: JSON.stringify(body) }) }

function deps(over: Partial<CheckoutDeps> = {}) {
  const created: Array<Record<string, any>> = []
  const options: Array<any> = []
  const rows: Array<Record<string, any>> = []
  const d: CheckoutDeps = {
    stripe: { checkout: { sessions: { create: async (params, opt) => { created.push(params); options.push(opt); return { id: "cs_1", url: "https://checkout.stripe.test/s" } } } } },
    sheet: { ogCheck: async () => ({ ok: true, eligible: false, rank: 500, used: false }), upsertOrder: async row => { rows.push(row); return { ok: true, created: true } } },
    fetchQuote: async () => fullQuote(),
    randomInt: () => 1,
    now: () => new Date("2026-10-17T00:00:00Z"),
    ...over,
  }
  return { d, created, rows, options }
}

test("503 checkout_unavailable without Stripe keys", async () => {
  const res = await POST(req({ code: FULL_CODE, lane: "A", addOnIds: [], email: "a@b.co" }))
  assert.equal(res.status, 503)
  assert.deepEqual(await res.json(), { error: "checkout_unavailable" })
})

test("tampered client prices are ignored: Stripe gets the server quote", async () => {
  const { d, created, rows, options } = deps()
  const res = await handleCheckout(req({ code: FULL_CODE, lane: "A", addOnIds: [], email: "A@B.co", total: 1, totalFils: 1, parts: [{ price: 1 }], lines: [{ amountFils: 1 }], og: true }), d)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { url: "https://checkout.stripe.test/s" })
  const s = created[0]
  const sum = s.line_items.reduce((t: number, l: any) => t + l.price_data.unit_amount * l.quantity, 0)
  assert.equal(sum, 700000 + 70000 + 42500) // not discounted: og came from the sheet (false), not the client
  assert.equal(s.customer_email, "a@b.co")
  assert.equal(s.mode, "payment")
  assert.equal(s.integration_identifier, stripeIntegrationId)
  assert.deepEqual(options[0], { idempotencyKey: `checkout_${rows[0].order_id}` })
  assert.equal(s.payment_intent_data.capture_method, "manual")
  assert.deepEqual(s.shipping_address_collection, { allowed_countries: ["AE"] })
  assert.equal(s.metadata.order_id, rows[0].order_id)
  assert.match(rows[0].order_id, /^GG-[0-9A-Z]{6}$/)
  assert.equal(rows[0].status, "checkout_started")
  assert.equal(rows[0].total_aed, 8125)
  assert.equal(s.payment_intent_data.statement_descriptor_suffix, "GGPC")
  assert.equal(rows[0].stripe_fee_est_aed, 439.85)
  assert.equal(rows[0].net_service_aed, 685.15)
  assert.equal(s.cancel_url, `https://www.ggpc.app/build/${FULL_CODE}`)
})

test("Lane B is not manual capture and needs a workshop address", async () => {
  const { d } = deps()
  const res = await handleCheckout(req({ code: FULL_CODE, lane: "B", addOnIds: [], email: "a@b.co" }), d)
  assert.equal(res.status, 409)
  assert.deepEqual(await res.json(), { error: "lane_unavailable", reason: "no_workshop" })
})

test("stale parts block Lane A with 409, nothing is written", async () => {
  const { d, created, rows } = deps({ fetchQuote: async () => fullQuote({}, { GPU: { status: "stale" } }) })
  const res = await handleCheckout(req({ code: FULL_CODE, lane: "A", addOnIds: [], email: "a@b.co" }), d)
  assert.equal(res.status, 409)
  assert.equal(created.length + rows.length, 0)
})

test("OG eligibility comes from the sheet and discounts the service only", async () => {
  const { d, created } = deps({ sheet: { ogCheck: async () => ({ ok: true, eligible: true, rank: 3, used: false }), upsertOrder: async () => ({ ok: true, created: true }) } })
  await handleCheckout(req({ code: FULL_CODE, lane: "A", addOnIds: [], email: "a@b.co" }), d)
  const sum = created[0].line_items.reduce((t: number, l: any) => t + l.price_data.unit_amount, 0)
  assert.equal(sum, 700000 + 112500 - 11250)
})

test("sheet failure means no Stripe session (502)", async () => {
  const { d, created } = deps({ sheet: { ogCheck: async () => ({ ok: true, eligible: false, rank: null, used: false }), upsertOrder: async () => { throw new Error("down") } } })
  const res = await handleCheckout(req({ code: FULL_CODE, lane: "A", addOnIds: [], email: "a@b.co" }), d)
  assert.equal(res.status, 502)
  assert.equal(created.length, 0)
})

test("validation: bad email, bad code, unsellable add-on", async () => {
  const { d } = deps()
  assert.equal((await handleCheckout(req({ code: FULL_CODE, lane: "A", addOnIds: [], email: "nope" }), d)).status, 400)
  assert.equal((await handleCheckout(req({ code: "1.xx", lane: "A", addOnIds: [], email: "a@b.co" }), d)).status, 400)
  assert.equal((await handleCheckout(req({ code: FULL_CODE, lane: "A", addOnIds: ["delivery_uae"], email: "a@b.co" }), d)).status, 400)
})

test("quote service not live returns 502 not_live", async () => {
  const { d } = deps({ fetchQuote: async () => ({ error: "not_live" as const }) })
  const res = await handleCheckout(req({ code: FULL_CODE, lane: "A", addOnIds: [], email: "a@b.co" }), d)
  assert.equal(res.status, 502)
  assert.deepEqual(await res.json(), { error: "not_live" })
})
