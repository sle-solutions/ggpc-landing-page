import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { decodeBuildCode, toQuoteRequest } from "../lib/order/build-code"
import { fetchQuote } from "../lib/order/quote"
import { rowForEvent } from "../lib/order/webhook"
import { FULL_CODE, fullQuote } from "./order-fixtures"

const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch })
const stripe = { paymentIntents: { retrieve: async (id: string) => ({ id, status: id === "pi_hold" ? "requires_capture" : id === "pi_paid" ? "succeeded" : "processing" }) } }

test("fetchQuote posts the code's candidates and maps 404 to not_live", async () => {
  const decoded = decodeBuildCode(FULL_CODE)
  if (!decoded.ok) throw new Error("fixture")
  let sent: any
  globalThis.fetch = (async (url: string, init: RequestInit) => { sent = { url, body: JSON.parse(String(init.body)) }; return Response.json(fullQuote()) }) as typeof fetch
  const q = await fetchQuote(toQuoteRequest(decoded.build))
  assert.ok(!("error" in q))
  assert.match(sent.url, /\/api\/prices\/quote$/)
  assert.equal(sent.body.parts.length, 8)
  globalThis.fetch = (async () => new Response("nope", { status: 404 })) as typeof fetch
  assert.deepEqual(await fetchQuote(toQuoteRequest(decoded.build)), { error: "not_live" })
  globalThis.fetch = (async () => { throw new Error("boom") }) as typeof fetch
  assert.deepEqual(await fetchQuote(toQuoteRequest(decoded.build)), { error: "api_down" })
})

test("webhook maps Stripe events to order statuses and customer fields", async () => {
  const session = (pi: string) => ({ id: "cs_1", payment_intent: pi, metadata: { order_id: "GG-ABC123" }, customer_details: { email: "A@B.co", name: "Billing", phone: "+971500000000", address: null }, collected_information: { shipping_details: { name: "Ship Name", address: { line1: "1 Road", city: "Dubai", country: "AE" } } } })
  const hold = await rowForEvent({ type: "checkout.session.completed", data: { object: session("pi_hold") } } as any, stripe)
  assert.deepEqual(hold, { order_id: "GG-ABC123", status: "authorized", stripe_session: "cs_1", payment_intent: "pi_hold", name: "Ship Name", email: "a@b.co", phone: "+971500000000", address: "1 Road, Dubai, AE" })
  assert.equal((await rowForEvent({ type: "checkout.session.async_payment_succeeded", data: { object: session("pi_paid") } } as any, stripe))?.status, "paid")
  assert.equal(await rowForEvent({ type: "checkout.session.completed", data: { object: session("pi_wait") } } as any, stripe), null)
  const pi = (type: string) => rowForEvent({ type, data: { object: { id: "pi_1", metadata: { order_id: "GG-ABC123" } } } } as any, stripe)
  assert.equal((await pi("payment_intent.succeeded"))?.status, "paid")
  assert.equal((await pi("payment_intent.canceled"))?.status, "canceled")
  assert.equal((await rowForEvent({ type: "checkout.session.expired", data: { object: session("pi_x") } } as any, stripe))?.status, "expired")
  assert.equal(await rowForEvent({ type: "charge.refunded", data: { object: {} } } as any, stripe), null)
})
