import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { sheet } from "../lib/order/sheet"
import { scriptFixture } from "./order-script-fixture"
const realFetch = globalThis.fetch
const intent = "11111111-2222-4333-8444-555555555555", binding = "a".repeat(64), email = "member@example.invalid"
afterEach(() => { globalThis.fetch = realFetch; delete process.env.WAITLIST_SHEET_URL; delete process.env.WAITLIST_SHEET_SECRET })
function configured() { process.env.WAITLIST_SHEET_URL = "https://sheet.example.invalid/exec"; process.env.WAITLIST_SHEET_SECRET = "synthetic-only" }
const payload = () => ({ intent, binding, email, order: { order_id: "GG-ABC123", email, status: "checkout_started", og_applied: false }, ogOrder: { order_id: "GG-ABC123", email, status: "checkout_started", og_applied: true } })
test("actual server transport and actual Apps Script share reserve/attach/transition protocol without exposing secret to browser", async () => {
  configured(); const f = scriptFixture(), actions: string[] = []
  globalThis.fetch = async (url, init) => { assert.equal(url, "https://sheet.example.invalid/exec"); assert.equal(init?.cache, "no-store"); const body = JSON.parse(String(init?.body)); assert.equal(body.secret, "synthetic-only"); actions.push(body.action); return Response.json(f.dispatch(body.action, body.checkout)) }
  assert.equal((await sheet.reserveCheckout(payload())).og, true); const ref = { orderId: "GG-ABC123", intent, binding }; await sheet.attachCheckout({ ...ref, session: "cs_test" }); await sheet.transitionCheckout({ ...ref, eventId: "evt_test", order: { order_id: ref.orderId, status: "paid", stripe_session: "cs_test" } }); assert.equal(f.claim().state, "consumed"); assert.deepEqual(actions, ["checkout_reserve", "checkout_attach", "checkout_transition"])
})
test("malformed/unavailable transport never creates a reservation success and floor failure stays explicit", async () => {
  configured()
  for (const value of [{ ok: true }, { ok: true, orderId: "anything", og: true }, { ok: false, error: "reservation_required" }]) { globalThis.fetch = async () => Response.json(value); await assert.rejects(sheet.reserveCheckout(payload())) }
  globalThis.fetch = async () => Response.json({ ok: false, error: "below_floor" }); await assert.rejects(sheet.reserveCheckout(payload()), /below_floor/)
  globalThis.fetch = async () => Response.json({ ok: true, orderId: "GG-ABC123", og: true }, { status: 500 }); await assert.rejects(sheet.reserveCheckout(payload()))
  globalThis.fetch = async () => { throw new Error("unknown network result") }; await assert.rejects(sheet.attachCheckout({ orderId: "GG-ABC123", intent, binding, session: "cs_test" }))
})
