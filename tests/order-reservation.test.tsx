import assert from "node:assert/strict"
import { test } from "node:test"
import { handleCheckout, type CheckoutDeps } from "../lib/order/checkout"
import { handleEvent } from "../lib/order/webhook"
import type { CheckoutReservation, ClaimRef } from "../lib/order/sheet"
import { scriptFixture } from "./order-script-fixture"
import { FULL_CODE, fullQuote } from "./order-fixtures"

const email = "member@example.invalid", other = "billing@example.invalid", intent = "11111111-2222-4333-8444-555555555555", secondIntent = "22222222-3333-4444-8555-666666666666", binding = "a".repeat(64)
const reservation = (over: Partial<CheckoutReservation> = {}): CheckoutReservation => ({ intent, binding, email, order: { order_id: "GG-ABC123", email, status: "checkout_started", og_applied: false }, ogOrder: { order_id: "GG-ABC123", email, status: "checkout_started", og_applied: true }, ...over })
const ref: ClaimRef = { orderId: "GG-ABC123", intent, binding }
function request(over: Record<string, unknown> = {}) { return new Request("http://localhost/api/order/checkout", { method: "POST", body: JSON.stringify({ code: FULL_CODE, lane: "A", email, intent, addOnIds: [], ...over }) }) }
function workflow(f = scriptFixture()) {
  const sessions = new Map<string, { id: string; url: string }>(), sent: Array<Record<string, any>> = [], keys: string[] = []
  let order = 0
  const deps: CheckoutDeps = { sheet: f.client, fetchQuote: async () => fullQuote(), randomInt: () => ++order % 30, stripe: { checkout: { sessions: { async create(params, options) { assert.equal(f.locked(), false); sent.push(params); keys.push(options!.idempotencyKey!); let s = sessions.get(keys.at(-1)!); if (!s) { s = { id: "cs_test_" + (sessions.size + 1), url: "https://checkout.stripe.test/" + (sessions.size + 1) }; sessions.set(keys.at(-1)!, s) } return s } } } } }
  return { f, deps, sessions, sent, keys }
}
test("shared reserve: exact replay reuses one order; competing intents cannot claim same OG benefit", async () => {
  const f = scriptFixture({ legacyHeaders: true }), original = f.headers.slice(0, 43)
  const first = await f.client.reserveCheckout(reservation()), replay = await f.client.reserveCheckout(reservation({ order: { ...reservation().order, order_id: "GG-XYZ123" }, ogOrder: { ...reservation().ogOrder!, order_id: "GG-XYZ123" } }))
  assert.equal(first.og, true); assert.equal(first.orderId, replay.orderId); assert.equal(f.sheets.Orders.rows.length, 2); assert.deepEqual(f.sheets.Orders.rows[0].slice(0, 43), original)
  await assert.rejects(f.client.reserveCheckout(reservation({ intent: secondIntent })))
  await assert.rejects(f.client.reserveCheckout(reservation({ binding: "b".repeat(64) })))
  assert.equal(f.claim().state, "held")
})
test("real checkout concurrent legacy requests produce one OG session; no informational fallback authorizes", async () => {
  const w = workflow(); const results = await Promise.all([handleCheckout(request(), w.deps), handleCheckout(request({ intent: secondIntent }), w.deps)])
  assert.deepEqual(results.map(r => r.status).sort(), [200, 502]); assert.equal(w.sessions.size, 1); assert.equal(w.f.claim().session, "cs_test_1"); assert.equal(w.f.dispatch("og_check", email).ok, false)
  assert.equal(w.sent[0].line_items.find((l: any) => l.price_data.product_data.name === "Buyer protection").price_data.unit_amount, 14900)
})
test("same HTTP intent retries stable Stripe parameters/order/key despite a different candidate and observation age", async () => {
  const w = workflow(); const first = await handleCheckout(request(), w.deps); w.deps.fetchQuote = async () => { const q = fullQuote(); q.generatedAt = "2026-11-06T00:00:00Z"; for (const p of q.parts) if (p.chosen) p.chosen.ageSeconds = (p.chosen.ageSeconds ?? 0) + 3600; return q }
  const second = await handleCheckout(request(), w.deps); assert.equal(first.status, 200); assert.equal(second.status, 200); assert.deepEqual(await first.json(), await second.json()); assert.equal(w.sessions.size, 1); assert.equal(w.keys[0], w.keys[1]); assert.deepEqual(w.sent[0], w.sent[1]); assert.equal(w.f.sheets.Orders.rows.length, 2)
})
test("failed reservation or unknown durable append cannot create provider session and same retry recovers original hold", async () => {
  const w = workflow(); let once = true; w.f.onFlush(() => { if (once) { once = false; throw new Error("lost durable response") } }); assert.equal((await handleCheckout(request(), w.deps)).status, 502); assert.equal(w.sent.length, 0); assert.equal(w.f.claim().state, "held"); assert.equal((await handleCheckout(request(), w.deps)).status, 200); assert.equal(w.sessions.size, 1)
})
test("unknown provider creation retains hold and same idempotent retry recovers without another session", async () => {
  const w = workflow(), create = w.deps.stripe!.checkout.sessions.create; let once = true
  w.deps.stripe!.checkout.sessions.create = async (...args) => { const s = await create(...args); if (once) { once = false; throw new Error("unknown create") } return s }
  assert.equal((await handleCheckout(request(), w.deps)).status, 502); assert.equal(w.f.claim().state, "held"); assert.equal(w.sessions.size, 1); assert.equal((await handleCheckout(request(), w.deps)).status, 200); assert.equal(w.sessions.size, 1)
})
test("unknown attachment never returns a URL; same session attach recovers; conflicting session is rejected", async () => {
  const w = workflow(), attach = w.f.client.attachCheckout; let once = true
  w.f.client.attachCheckout = async value => { const r = await attach(value); if (once) { once = false; throw new Error("lost attach response") } return r }
  const first = await handleCheckout(request(), w.deps); assert.equal(first.status, 502); assert.equal((await first.json()).url, undefined); assert.equal(w.f.claim().session, "cs_test_1"); assert.equal((await handleCheckout(request(), w.deps)).status, 200); assert.equal(w.sessions.size, 1)
  const c = w.f.claim(); await assert.rejects(w.f.client.attachCheckout({ orderId: w.sent[0].metadata.order_id, intent: c.intent, binding: c.binding, session: "cs_other" }))
})
test("monotonic consumed identity survives billing email changes, cancellation and duplicate signed event delivery", async () => {
  const w = workflow(); assert.equal((await handleCheckout(request(), w.deps)).status, 200); const metadata = w.sent[0].metadata
  const stripe = { paymentIntents: { retrieve: async (id: string) => { assert.equal(w.f.locked(), false); return { id, status: "requires_capture", metadata } } } }
  const event = { id: "evt_authorized", type: "checkout.session.completed", data: { object: { id: "cs_test_1", metadata, payment_intent: "pi_test_1", customer_details: { email: other } } } } as any
  await handleEvent(event, { stripe, sheet: w.f.client }); await handleEvent(event, { stripe, sheet: w.f.client }); assert.equal(w.f.claim().state, "consumed"); assert.equal(w.f.claim().member, email); assert.equal(w.f.claim().events.length, 1); assert.equal(w.f.sheets.Orders.rows[1][w.f.headers.indexOf("Email")], other)
  await handleEvent({ id: "evt_canceled", type: "payment_intent.canceled", data: { object: { id: "pi_test_1", metadata } } } as any, { stripe, sheet: w.f.client }); assert.equal(w.f.info(email).used, true); assert.equal((await w.f.client.reserveCheckout(reservation({ intent: secondIntent }))).og, false)
})
test("late positive after negative consumes and duplicate event repairs a partial status write without touching manual cells", async () => {
  const f = scriptFixture(); await f.client.reserveCheckout(reservation()); await f.client.attachCheckout({ ...ref, session: "cs_test" }); const col = (s: string) => f.headers.indexOf(s); f.sheets.Orders.rows[1][col("Notes")] = "operator note"; f.sheets.Orders.rows[1][col("Actual customer payments AED")] = 123
  await f.client.transitionCheckout({ ...ref, eventId: "evt_cancel", order: { order_id: ref.orderId, status: "canceled", stripe_session: "cs_test" } })
  let once = true; f.onWrite((phase, row, column) => { if (phase === "before" && row === 2 && column === 1 && once) { once = false; throw new Error("status write failed") } })
  const paid = { ...ref, eventId: "evt_late_paid", order: { order_id: ref.orderId, status: "paid", stripe_session: "cs_test" } }
  await assert.rejects(f.client.transitionCheckout(paid)); assert.equal(f.claim().state, "consumed"); await f.client.transitionCheckout(paid); assert.equal(f.claim().events.length, 2); assert.equal(f.sheets.Orders.rows[1][col("Notes")], "operator note"); assert.equal(f.sheets.Orders.rows[1][col("Actual customer payments AED")], 123); assert.equal(f.info(email).used, true)
})
test("manual fields edited during a managed write are not overwritten by the stale row projection", async () => {
  const f = scriptFixture(); await f.client.reserveCheckout(reservation()); const notes = f.headers.indexOf("Notes"); f.onWrite((phase, row, col) => { if (phase === "before" && row === 2 && col === 1) f.sheets.Orders.rows[1][notes] = "new concurrent operator note" }); await f.client.attachCheckout({ ...ref, session: "cs_test" }); assert.equal(f.sheets.Orders.rows[1][notes], "new concurrent operator note")
})
test("legacy used/old/terminal-looking rows never auto-release; immutable legacy identity and unknown shapes fail closed", async () => {
  for (const status of ["paid", "authorized", "canceled", "expired", "checkout_started"]) { const f = scriptFixture(); f.legacy({ "Order ID": "GG-LEG123", Email: email, "OG applied": true, Status: status, Created: new Date(0) }); if (["paid", "authorized"].includes(status)) assert.equal((await f.client.reserveCheckout(reservation())).og, false); else await assert.rejects(f.client.reserveCheckout(reservation())); if (status === "paid") await assert.rejects(f.client.upsertOrder({ order_id: "GG-LEG123", email: other })) }
  const f = scriptFixture(); f.sheets.Orders.rows[0][10] = "unexpected"; await assert.rejects(f.client.reserveCheckout(reservation())); assert.equal(f.sheets.Orders.rows.length, 1)
})
test("no age-only release or provider-create retry after the bounded idempotency window; mismatched events refuse", async () => {
  const f = scriptFixture(); await f.client.reserveCheckout(reservation()); const old = f.claim(); old.createdAt = new Date(Date.now() - 21 * 3600000).toISOString(); f.sheets.Orders.rows[1][f.headers.indexOf("Checkout claim")] = JSON.stringify(old); await assert.rejects(f.client.reserveCheckout(reservation())); assert.equal(f.info(email).used, true)
  await assert.rejects(f.client.transitionCheckout({ ...ref, eventId: "evt_bad", order: { order_id: ref.orderId, status: "paid", stripe_session: "cs_test" }, binding: "b".repeat(64) })); assert.equal(f.claim().state, "held")
})
test("nonmembers get ordinary fee math; malformed/old clients and changed server quote cannot silently rebind", async () => {
  const w = workflow(scriptFixture({ waitlist: [other] })); assert.equal((await handleCheckout(request(), w.deps)).status, 200); assert.equal(w.f.claim().og, false)
  const next = workflow(); assert.equal((await handleCheckout(request({ intent: undefined }), next.deps)).status, 400); assert.equal(next.sent.length, 0); assert.equal((await handleCheckout(request(), next.deps)).status, 200); next.deps.fetchQuote = async () => { const q = fullQuote(); q.parts[0].chosen!.price! += 1; return q }; assert.equal((await handleCheckout(request(), next.deps)).status, 502); assert.equal(next.sessions.size, 1)
})

test("reservation before-write failure creates no hold/session and attachment failure retains the original hold/session", async () => {
  const w = workflow(); let once = true; w.f.onWrite((phase, row) => { if (phase === "before" && row === 2 && once) { once = false; throw new Error("quota") } }); assert.equal((await handleCheckout(request(), w.deps)).status, 502); assert.equal(w.f.sheets.Orders.rows.length, 1); assert.equal(w.sent.length, 0); assert.equal((await handleCheckout(request(), w.deps)).status, 200)
  const attached = workflow(); let fail = true; attached.f.onWrite((phase, row, col) => { if (phase === "before" && row === 2 && col === 44 && fail) { fail = false; throw new Error("attach quota") } }); assert.equal((await handleCheckout(request(), attached.deps)).status, 502); assert.equal(attached.f.claim().session, ""); assert.equal(attached.sessions.size, 1); assert.equal((await handleCheckout(request(), attached.deps)).status, 200); assert.equal(attached.sessions.size, 1)
})
test("webhook can consume before HTTP attachment, and all provider/notification operations run outside ScriptLock", async () => {
  const w = workflow(scriptFixture({ notify: true })), create = w.deps.stripe!.checkout.sessions.create
  w.deps.stripe!.checkout.sessions.create = async (...args) => {
    const session = await create(...args), metadata = args[0].metadata
    await handleEvent({ id: "evt_before_attach", type: "checkout.session.completed", data: { object: { id: session.id, payment_intent: "pi_before_attach", metadata } } } as any, { stripe: { paymentIntents: { retrieve: async id => { assert.equal(w.f.locked(), false); return { id, status: "succeeded", metadata: metadata as Record<string, string> } } } }, sheet: w.f.client }); return session
  }
  assert.equal((await handleCheckout(request(), w.deps)).status, 200); assert.equal(w.f.claim().state, "consumed"); assert.equal(w.f.claim().session, "cs_test_1"); assert.equal(w.f.notifications(), 1)
})
test("mismatched or reused event identities and missing claim metadata cannot bypass consumption authority", async () => {
  const f = scriptFixture(); await f.client.reserveCheckout(reservation()); await f.client.attachCheckout({ ...ref, session: "cs_original" })
  await assert.rejects(f.client.transitionCheckout({ ...ref, eventId: "evt_other", order: { order_id: ref.orderId, status: "paid", stripe_session: "cs_other" } }))
  const event = { ...ref, eventId: "evt_original", order: { order_id: ref.orderId, status: "authorized", stripe_session: "cs_original" } }; await f.client.transitionCheckout(event)
  await assert.rejects(f.client.transitionCheckout({ ...event, order: { ...event.order, status: "canceled" } })); assert.equal(f.claim().state, "consumed")
  await assert.rejects(handleEvent({ id: "evt_legacy", type: "payment_intent.canceled", data: { object: { id: "pi_legacy", metadata: { order_id: ref.orderId } } } } as any, { stripe: { paymentIntents: { retrieve: async id => ({ id, status: "succeeded" }) } }, sheet: f.client }))
  await assert.rejects(f.client.upsertOrder({ order_id: "GG-NEW123", email, status: "checkout_started", og_applied: true })); assert.equal(f.sheets.Orders.rows.length, 2)
})
test("all existing manual columns survive attach/transition and unknown legacy claim shapes or membership remain blocked", async () => {
  const f = scriptFixture(); await f.client.reserveCheckout(reservation()); const manualIndices = [24, ...Array.from({ length: 15 }, (_, i) => 28 + i)]; for (const i of manualIndices) f.sheets.Orders.rows[1][i] = "manual-" + i; await f.client.attachCheckout({ ...ref, session: "cs_manual" }); await f.client.transitionCheckout({ ...ref, eventId: "evt_manual", order: { order_id: ref.orderId, status: "paid", stripe_session: "cs_manual" } }); for (const i of manualIndices) assert.equal(f.sheets.Orders.rows[1][i], "manual-" + i)
  const duplicate = scriptFixture({ waitlist: [email, email] }); await assert.rejects(duplicate.client.reserveCheckout(reservation())); assert.equal(duplicate.sheets.Orders.rows.length, 1)
  const malformed = scriptFixture(); malformed.legacy({ "Order ID": "GG-BAD123", Email: email, "OG applied": true, "Checkout claim": '{"v":999}' }); await assert.rejects(malformed.client.reserveCheckout(reservation())); assert.equal(malformed.sheets.Orders.rows.length, 2)
  const wrongId = scriptFixture(); await wrongId.client.reserveCheckout(reservation()); wrongId.sheets.Orders.rows[1][0] = "GG-XYZ123"; await assert.rejects(wrongId.client.reserveCheckout(reservation())); assert.equal(wrongId.claim().orderId, "GG-ABC123")
})
test("first-100 and frozen physical order remain authoritative, with missing/malformed data failing closed", async () => {
  const members = Array.from({ length: 101 }, (_, i) => `member${i}@example.invalid`), f = scriptFixture({ waitlist: members }); assert.equal(f.info(members[99]).rank, 100); assert.equal(f.info(members[100]).eligible, false)
  const frozen = scriptFixture({ waitlist: [], og: [email, other] }); frozen.sheets.OG.rows[1][1] = 999; assert.equal(frozen.info(email).rank, 1); assert.equal((await frozen.client.reserveCheckout(reservation())).og, true)
  const badDate = scriptFixture(); badDate.sheets.Waitlist.rows[1][1] = "not-a-date"; await assert.rejects(badDate.client.reserveCheckout(reservation())); assert.equal(badDate.sheets.Orders.rows.length, 1)
})

test("concurrent identical HTTP intents share one order and one provider idempotency key", async () => {
  const w = workflow(), create = w.deps.stripe!.checkout.sessions.create; let started = 0, release!: () => void; const barrier = new Promise<void>(resolve => { release = resolve })
  w.deps.stripe!.checkout.sessions.create = async (...args) => { const session = await create(...args); if (++started === 2) release(); await barrier; return session }
  const responses = await Promise.all([handleCheckout(request(), w.deps), handleCheckout(request(), w.deps)]); assert.deepEqual(responses.map(r => r.status), [200, 200]); assert.equal(w.sessions.size, 1); assert.equal(w.keys[0], w.keys[1]); assert.equal(w.f.sheets.Orders.rows.length, 2)
})
test("read failure and malformed readback never become successful checkout; unknown schema is not extended", async () => {
  const w = workflow(); w.f.onRead(() => { throw new Error("storage read failed") }); assert.equal((await handleCheckout(request(), w.deps)).status, 502); assert.equal(w.sent.length, 0)
  const broken = workflow(); let once = true; broken.f.onFlush(() => { if (once) { once = false; broken.f.sheets.Orders.rows[1][43] = "unknown durable content" } }); assert.equal((await handleCheckout(request(), broken.deps)).status, 502); assert.equal(broken.sent.length, 0); assert.equal((await handleCheckout(request(), broken.deps)).status, 502)
  const shape = scriptFixture(); shape.sheets.Orders.rows[0] = ["Order ID"]; await assert.rejects(shape.client.reserveCheckout(reservation())); assert.deepEqual(shape.sheets.Orders.rows[0], ["Order ID"])
})
test("used members retain ordinary full-price checkout; a pending hold cannot silently choose full price", async () => {
  const consumed = workflow(); consumed.f.legacy({ "Order ID": "GG-LEG123", Email: email, "OG applied": true, Status: "paid" }); assert.equal((await handleCheckout(request(), consumed.deps)).status, 200); assert.equal(consumed.f.claim(2).og, false); assert.equal(consumed.sent[0].metadata.og, "false")
  const held = workflow(); held.f.legacy({ "Order ID": "GG-LEG123", Email: email, "OG applied": true, Status: "canceled" }); assert.equal((await handleCheckout(request(), held.deps)).status, 502); assert.equal(held.sent.length, 0)
})

test("managed Session and retrieved PaymentIntent must agree on exact claim metadata before consuming", async () => {
  const w = workflow(); assert.equal((await handleCheckout(request(), w.deps)).status, 200); const metadata = w.sent[0].metadata
  const event = { id: "evt_wrong_pi", type: "checkout.session.completed", data: { object: { id: "cs_test_1", payment_intent: "pi_expected", metadata } } } as any
  for (const response of [{ id: "pi_other", status: "succeeded", metadata }, { id: "pi_expected", status: "succeeded", metadata: { ...metadata, checkout_binding: "b".repeat(64) } }, { id: "pi_expected", status: "succeeded" }]) await assert.rejects(handleEvent(event, { stripe: { paymentIntents: { retrieve: async () => response } }, sheet: w.f.client }))
  assert.equal(w.f.claim().state, "held"); assert.equal(w.f.claim().events.length, 0)
})
test("member discount below the unchanged labour floor refuses before hold/session; nonmember ordinary fee can still pass", async () => {
  const { ORDER } = await import("../lib/order/config"), original = ORDER.buildFeeFils
  ;(ORDER as { buildFeeFils: number }).buildFeeFils = 18000
  try {
    const member = workflow(); const response = await handleCheckout(request({ lane: "B" }), member.deps); assert.equal(response.status, 422); assert.deepEqual(await response.json(), { error: "below_floor" }); assert.equal(member.f.sheets.Orders.rows.length, 1); assert.equal(member.sent.length, 0)
    const normal = workflow(scriptFixture({ waitlist: [other] })); assert.equal((await handleCheckout(request({ lane: "B" }), normal.deps)).status, 200)
  } finally { (ORDER as { buildFeeFils: number }).buildFeeFils = original }
})

test("duplicate Session event after manual capture can advance authorized to paid without a second consumption/event", async () => {
  const w = workflow(); assert.equal((await handleCheckout(request(), w.deps)).status, 200); const metadata = w.sent[0].metadata
  const event = { id: "evt_capture_replay", type: "checkout.session.completed", data: { object: { id: "cs_test_1", payment_intent: "pi_capture", metadata } } } as any
  let status = "requires_capture"; const deps = { stripe: { paymentIntents: { retrieve: async (id: string) => ({ id, status, metadata }) } }, sheet: w.f.client }
  await handleEvent(event, deps); status = "succeeded"; await handleEvent(event, deps); assert.equal(w.f.claim().state, "consumed"); assert.equal(w.f.claim().events.length, 1); assert.equal(w.f.sheets.Orders.rows[1][w.f.headers.indexOf("Status")], "paid")
})

test("hour/day age bucket retries retain original freshness snapshot while identity/price/fee binding stays exact", async () => {
  const w = workflow(), col = (s: string) => w.f.headers.indexOf(s); assert.equal((await handleCheckout(request(), w.deps)).status, 200)
  const originalParts = w.f.sheets.Orders.rows[1][col("Parts")], originalChecked = w.f.sheets.Orders.rows[1][col("Prices checked")]
  for (const age of [3600, 172800]) {
    w.deps.fetchQuote = async () => { const q = fullQuote(); q.generatedAt = "2026-11-06T04:59:00Z"; for (const p of q.parts) if (p.chosen) p.chosen.ageSeconds = age; return q }
    assert.equal((await handleCheckout(request(), w.deps)).status, 200); assert.equal(w.f.sheets.Orders.rows[1][col("Parts")], originalParts); assert.equal(w.f.sheets.Orders.rows[1][col("Prices checked")], originalChecked); assert.equal(w.f.claim().partsSnapshot, originalParts)
  }
  assert.equal(w.sessions.size, 1); assert.equal(new Set(w.keys).size, 1)
  w.deps.fetchQuote = async () => { const q = fullQuote(); q.parts[0].chosen!.retailerSku += "-different"; return q }; assert.equal((await handleCheckout(request(), w.deps)).status, 502)
  w.f.sheets.Orders.rows[1][col("Parts")] = "changed original snapshot"; w.deps.fetchQuote = async () => fullQuote(); assert.equal((await handleCheckout(request(), w.deps)).status, 502); assert.equal(w.sessions.size, 1)
})
test("known-consumed legacy proof survives cancellation and permits later full-price without another perk", async () => {
  const f = scriptFixture(); f.legacy({ "Order ID": "GG-LEG123", Email: email, "OG applied": true, Status: "authorized" }); const col = (s: string) => f.headers.indexOf(s); f.sheets.Orders.rows[1][col("Notes")] = "manual evidence"
  await f.client.upsertOrder({ order_id: "GG-LEG123", status: "canceled" }); const proof = f.claim(); assert.equal(proof.kind, "legacy-consumed"); assert.equal(proof.member, email); assert.equal(proof.observedStatus, "authorized"); assert.equal(proof.state, "consumed"); assert.equal(f.info(email).used, true); assert.equal(f.sheets.Orders.rows[1][col("Status")], "canceled")
  assert.equal((await f.client.reserveCheckout(reservation())).og, false); await f.client.upsertOrder({ order_id: "GG-LEG123", status: "canceled" }); assert.deepEqual(f.claim(), proof); assert.equal(f.sheets.Orders.rows[1][col("Notes")], "manual evidence")
  await assert.rejects(f.client.upsertOrder({ order_id: "GG-LEG123", email: other })); await assert.rejects(f.client.upsertOrder({ order_id: "GG-LEG123", og_applied: false })); assert.equal(f.info(email).used, true)
})
test("interrupted legacy downgrade preserves consumption before status write; retry repairs without losing proof", async () => {
  for (const at of ["claim-before", "status-before", "status-after"]) {
    const f = scriptFixture(); f.legacy({ "Order ID": "GG-LEG123", Email: email, "OG applied": true, Status: "authorized" }); let once = true
    f.onWrite((phase, row, column) => { if (once && row === 2 && (at === "claim-before" && phase === "before" && column === 44 || at === "status-before" && phase === "before" && column === 1 || at === "status-after" && phase === "after" && column === 1)) { once = false; throw new Error("unknown legacy storage result") } })
    await assert.rejects(f.client.upsertOrder({ order_id: "GG-LEG123", status: "canceled" })); assert.equal(f.info(email).used, true); await f.client.upsertOrder({ order_id: "GG-LEG123", status: "canceled" }); assert.equal(f.claim().kind, "legacy-consumed"); assert.equal((await f.client.reserveCheckout(reservation())).og, false)
  }
  const ambiguous = scriptFixture(); ambiguous.legacy({ "Order ID": "GG-LEG123", Email: email, "OG applied": true, Status: "canceled" }); await ambiguous.client.upsertOrder({ order_id: "GG-LEG123", status: "canceled" }); assert.equal(ambiguous.sheets.Orders.rows[1][43], ""); await assert.rejects(ambiguous.client.reserveCheckout(reservation()))
})
