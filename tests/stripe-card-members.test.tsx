import assert from "node:assert/strict"
import { test, afterEach } from "node:test"
import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import Done from "../app/build/[code]/done/page"
import V1 from "./fixtures/stripe-v1-claim.json"
import Stripe from "stripe"
import { handleCheckout, type CheckoutDeps } from "../lib/order/checkout"
import { handleEvent } from "../lib/order/webhook"
import { readOrderReceipt } from "../lib/order/receipt"
import { sheet, reservationRequestBinding, RESERVATION_PROTOCOL } from "../lib/order/sheet"
import { cardCheckoutConfigured } from "../lib/order/stripe"
import { POST as checkoutPost } from "../app/api/order/checkout/route"
import { POST as webhookPost } from "../app/api/stripe/webhook/route"
import { allowPublicPageAnalytics, privateReceiptPath } from "../lib/identity/protocol"
import { FULL_CODE, fullQuote } from "./order-fixtures"
import { codedFixture, MEMBER_CODE, MEMBER_CREDENTIAL, MEMBER_EMAIL } from "./stripe-members-fixture"
import { scriptFixture } from "./order-script-fixture"
const id = "11111111-2222-4333-8444-555555555555", next = "22222222-3333-4444-8555-666666666666"
const envKeys = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "WAITLIST_SHEET_URL", "WAITLIST_SHEET_SECRET"] as const
const realFetch = globalThis.fetch
const original = Object.fromEntries(envKeys.map(key => [key, process.env[key]]))
afterEach(() => { globalThis.fetch = realFetch; for (const key of envKeys) { if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key] } })
const request = (over: Record<string, unknown> = {}) => new Request("https://example.invalid/api/order/checkout", { method: "POST", body: JSON.stringify({ code: FULL_CODE, lane: "A", email: MEMBER_EMAIL, addOnIds: [], intent: id, ...over }) })
function workflow(f = codedFixture()) {
  const created: any[] = [], keys: string[] = [], sessions = new Map<string, any>(); let candidate = 0
  const deps: CheckoutDeps = { sheet: f.client, fetchQuote: async () => fullQuote(), randomInt: () => ++candidate % 30, stripe: { checkout: { sessions: { create: async (params, opts) => {
    assert.equal(f.locked(), false); const key = opts!.idempotencyKey!; created.push(params); keys.push(key)
    const prior = sessions.get(key); if (prior) { assert.deepEqual(params, prior.params); return prior.session }
    const session = { id: "cs_test_" + (sessions.size + 1), url: "https://checkout.stripe.test/" + (sessions.size + 1) }; sessions.set(key, { params, session }); return session
  } } } } }
  const metadata = () => created[0].metadata as Record<string, string>
  const provider = (status = "succeeded") => ({ checkout: { sessions: { retrieve: async (session: string) => ({ id: session, mode: "payment", status: "complete", currency: "aed", payment_status: "paid", payment_intent: "pi_actual", metadata: metadata() }) } }, paymentIntents: { retrieve: async (pi: string) => ({ id: pi, status, metadata: metadata() }) } })
  async function positive(status = "succeeded") {
    await handleEvent({ id: "evt_positive", type: "checkout.session.completed", data: { object: { id: "cs_test_1", payment_intent: "pi_actual", metadata: metadata(), customer_details: { email: "billing@example.invalid" } } } } as any, { stripe: provider(status), sheet: f.client })
  }
  return { f, deps, created, keys, sessions, metadata, provider, positive }
}
function configured() {
  process.env.STRIPE_SECRET_KEY = "sk_test_SyntheticOfflineOnly"
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_SyntheticOfflineOnly"
  process.env.WAITLIST_SHEET_URL = "https://script.google.com/macros/s/SYNTHETIC_DEPLOYMENT/exec"
  process.env.WAITLIST_SHEET_SECRET = "synthetic-only"
}
function reservation(f: ReturnType<typeof codedFixture>, coded = true) {
  return { intent: id, binding: "a".repeat(64), email: MEMBER_EMAIL, order: { order_id: "GG-ABC123", email: MEMBER_EMAIL, status: "checkout_started", og_applied: false, lane: "B", build_code: FULL_CODE }, ogOrder: { order_id: "GG-ABC123", email: MEMBER_EMAIL, status: "checkout_started", og_applied: true, lane: "B", build_code: FULL_CODE }, memberCode: coded ? MEMBER_CREDENTIAL : null }
}

test("known victim email without its issued private code creates only ordinary-price claims and never holds/uses the OG benefit in either lane", async () => {
  for (const lane of ["A", "B"]) {
    const w = workflow(), ogBefore = JSON.stringify(w.f.sheets.OG.rows)
    assert.equal((await handleCheckout(request({ lane }), w.deps)).status, 200)
    assert.equal(w.f.claim().og, false); assert.equal(w.f.claim().v, 1)
    assert.equal(w.created[0].metadata.og, "false")
    const amounts = w.created[0].line_items.map((line: any) => line.price_data.unit_amount)
    assert.equal(amounts.reduce((a: number, b: number) => a + b, 0), lane === "A" ? 801900 : 59900)
    await w.positive()
    const proof = w.f.dispatch("member_code_check", { version: 1, email: MEMBER_EMAIL, digest: MEMBER_CREDENTIAL.digest })
    assert.equal(proof.available, true); assert.equal(proof.benefitState, "available"); assert.equal(proof.checkoutAuthorized, false)
    assert.equal(JSON.stringify(w.f.sheets.OG.rows), ogBefore)
    assert.equal((await handleCheckout(request({ lane, intent: next, memberCode: MEMBER_CODE }), w.deps)).status, 200)
    assert.equal(w.f.claim(2).og, true); assert.equal(w.f.claim(2).member, MEMBER_EMAIL)
  }
})
test("code plus original email works in both lanes with fee-only discount, existing capture, private metadata and immutable record anchors", async () => {
  for (const lane of ["A", "B"]) {
    const w = workflow(); assert.equal((await handleCheckout(request({ lane, memberCode: MEMBER_CODE, addOnIds: ["delivery_uae", "windows_setup"] }), w.deps)).status, 200)
    const params = w.created[0], claim = w.f.claim()
    assert.equal(claim.v, 2); assert.equal(claim.og, true); assert.equal(claim.memberCode.digest, MEMBER_CREDENTIAL.digest)
    assert.equal(claim.memberCode.issuanceId, w.f.sheets.OG.rows[1][3]); assert.equal(claim.memberCode.issuedAt, w.f.sheets.OG.rows[1][4])
    assert.equal(params.payment_intent_data.capture_method, lane === "A" ? "manual" : undefined)
    assert.deepEqual(params.managed_payments, { enabled: false }); assert.deepEqual(params.shipping_address_collection, { allowed_countries: ["AE"] })
    assert.equal(params.line_items.find((l: any) => l.price_data.product_data.name === "Buyer protection").price_data.unit_amount, 14900)
    for (const name of ["Delivery in the UAE", "Windows setup and drivers (licence not included)"]) assert.equal(params.line_items.find((l: any) => l.price_data.product_data.name === name).price_data.unit_amount, 7500)
    assert.equal(params.line_items.reduce((n: number, l: any) => n + l.price_data.unit_amount, 0), (lane === "A" ? 793200 : 55400) + 15000)
    assert(!JSON.stringify(params).includes(MEMBER_CODE)); assert(!JSON.stringify(w.f.sheets).includes(MEMBER_CODE))
    assert.deepEqual(Object.keys(params.metadata).sort(), ["checkout_binding", "checkout_intent", "lane", "og", "order_id"])
    assert(!JSON.stringify(params.metadata).includes(MEMBER_CREDENTIAL.digest))
    assert.equal((await handleCheckout(request({ lane, memberCode: MEMBER_CODE, addOnIds: ["windows_setup", "delivery_uae"] }), w.deps)).status, 200)
    assert.equal(w.sessions.size, 1); assert.equal(w.keys[0], w.keys[1]); assert.deepEqual(w.created[0], w.created[1])
  }
})
test("supplied malformed, wrong, unavailable or other-email code refuses without silent full-price fallback or proof reuse", async () => {
  for (const over of [{ memberCode: " " }, { memberCode: 1 }, { memberCode: MEMBER_CODE + "x" }, { memberCode: "GGPC-OG-" + Buffer.alloc(32, 2).toString("base64url") }, { memberCode: MEMBER_CODE, email: "other@example.invalid" }, { memberCode: MEMBER_CODE, email: "member+alias@example.invalid" }]) {
    const w = workflow(), before = JSON.stringify(w.f.sheets.Orders.rows)
    const response = await handleCheckout(request({ ...over, og: true, codeAuth: { checkoutAuthorized: true }, totalFils: 1 }), w.deps)
    assert([400, 409].includes(response.status)); assert.equal(w.created.length, 0); assert.equal(JSON.stringify(w.f.sheets.Orders.rows), before)
    assert(!JSON.stringify(await response.json()).includes(MEMBER_CODE))
  }
  const w = workflow(); assert.equal((await handleCheckout(request({ memberCode: MEMBER_CODE }), w.deps)).status, 200); await w.positive()
  assert.equal((await handleCheckout(request({ intent: next, memberCode: MEMBER_CODE }), w.deps)).status, 409)
  assert.equal(w.sessions.size, 1); assert.equal((await handleCheckout(request({ intent: next }), w.deps)).status, 200); assert.equal(w.f.claim(2).og, false)
})
test("ordinary victim-email traffic cannot steal or block the real member's code in either concurrency order", async () => {
  for (const realFirst of [true, false]) {
    const w = workflow(), codeReq = request({ memberCode: MEMBER_CODE }), ordinaryReq = request({ intent: next })
    const responses = await Promise.all((realFirst ? [codeReq, ordinaryReq] : [ordinaryReq, codeReq]).map(req => handleCheckout(req, w.deps)))
    assert.deepEqual(responses.map(r => r.status), [200, 200]); assert.equal(w.sessions.size, 2)
    const claims = w.f.sheets.Orders.rows.slice(1).map((_, i) => w.f.claim(i + 1))
    assert.equal(claims.filter(c => c.og).length, 1); assert.equal(claims.find(c => c.og).intent, id)
  }
})
test("fresh legacy reserve and informational/quote receipts never create email-only automatic discounts", async () => {
  const f = codedFixture(), input = reservation(f, false), before = JSON.stringify(f.sheets.Orders.rows)
  assert.equal(f.dispatch("checkout_reserve", input).ok, false)
  assert.equal(f.dispatch("og_check", MEMBER_EMAIL).ok, false)
  assert.equal(f.rawPost({ secret: "synthetic-only", action: "checkout_reserve_v2", checkout: { ...input, protocol: RESERVATION_PROTOCOL, requestBinding: reservationRequestBinding(input) + "f" } }).ok, false)
  const w = workflow(f)
  assert.equal((await handleCheckout(request({ og: true, codeAuth: { available: true, checkoutAuthorized: true }, memberQuote: { status: "conditional_quote" } }), w.deps)).status, 200)
  assert.equal(w.f.claim().og, false); assert.equal(JSON.parse(before).length, 1)
})
test("record/claim corruption or credential changes cannot rebind an own held v2 attempt", async () => {
  for (const change of ["digest", "issuance", "issuedAt", "claimDigest", "claimTime"]) {
    const w = workflow(); assert.equal((await handleCheckout(request({ memberCode: MEMBER_CODE }), w.deps)).status, 200)
    if (change === "digest") w.f.sheets.OG.rows[1][2] = "f".repeat(64)
    if (change === "issuance") w.f.sheets.OG.rows[1][3] = next
    if (change === "issuedAt") w.f.sheets.OG.rows[1][4] = "2026-10-18T00:00:00.000Z"
    if (change.startsWith("claim")) { const c = w.f.claim(); c.memberCode[change === "claimDigest" ? "digest" : "issuedAt"] = change === "claimDigest" ? "f".repeat(64) : "2026-10-18T00:00:00.000Z"; w.f.sheets.Orders.rows[1][43] = JSON.stringify(c) }
    const before = JSON.stringify(w.f.sheets.Orders.rows)
    assert.notEqual((await handleCheckout(request({ memberCode: MEMBER_CODE }), w.deps)).status, 200)
    assert.equal(w.sessions.size, 1); assert.equal(JSON.stringify(w.f.sheets.Orders.rows), before)
  }
})
test("malformed real quote identity and money stop before reservation or Stripe, with legitimate Lane B null prices preserved", async () => {
  for (const mutate of [(q: any) => { q.parts[0].chosen.retailerSku = "other" }, (q: any) => { q.parts[0].slot = "GPU" }, (q: any) => { q.parts[0].chosen.price = -1 }, (q: any) => { q.parts[0].chosen.price = NaN }, (q: any) => { q.parts[0].chosen.price = Number.MAX_SAFE_INTEGER }, (q: any) => { q.generatedAt = "not-a-time" }]) {
    const w = workflow(); w.deps.fetchQuote = async () => { const q = fullQuote(); mutate(q); return q }
    assert.equal((await handleCheckout(request({ memberCode: MEMBER_CODE }), w.deps)).status, 502)
    assert.equal(w.f.sheets.Orders.rows.length, 1); assert.equal(w.created.length, 0)
  }
  const w = workflow(); w.deps.fetchQuote = async () => fullQuote({}, { GPU: { price: null, status: "unpriced" } })
  assert.equal((await handleCheckout(request({ lane: "B", memberCode: MEMBER_CODE }), w.deps)).status, 200)
  assert.equal((await handleCheckout(new Request("https://example.invalid", { method: "POST", body: " ".repeat(16385) }), w.deps)).status, 413)
})
test("all four configuration inputs gate actual public card POST before quote/provider work", async () => {
  for (const key of envKeys) {
    configured(); delete process.env[key]; assert.equal(cardCheckoutConfigured(), false)
    assert.equal((await checkoutPost(request())).status, 503)
  }
  configured(); assert.equal(cardCheckoutConfigured(), true)
})
test("actual raw-body Stripe signature verification precedes authority writes; failed durable transition returns 500 and exact signed retry repairs once", async () => {
  configured(); const w = workflow(); await handleCheckout(request({ memberCode: MEMBER_CODE }), w.deps)
  const body = JSON.stringify({ id: "evt_signed", type: "payment_intent.succeeded", data: { object: { id: "pi_signed", metadata: w.metadata() } } })
  const sdk = new Stripe("sk_test_SyntheticOfflineOnly"), secret = process.env.STRIPE_WEBHOOK_SECRET!
  const signature = sdk.webhooks.generateTestHeaderString({ payload: body, secret })
  let calls = 0
  globalThis.fetch = async (_url, init) => { calls++; return Response.json(w.f.rawPost(JSON.parse(String(init?.body)))) }
  const posted = (text: string, sig?: string) => new Request("https://example.invalid/api/stripe/webhook", { method: "POST", body: text, headers: sig ? { "stripe-signature": sig } : {} })
  assert.equal((await webhookPost(posted(body))).status, 400)
  assert.equal((await webhookPost(posted(body + " ", signature))).status, 400); assert.equal(calls, 0)
  w.f.onFlush(() => { throw Error("synthetic storage unknown") })
  const error = console.error, messages: string[] = []; console.error = (...args) => { messages.push(args.join(" ")) }
  try { assert.equal((await webhookPost(posted(body, signature))).status, 500) } finally { console.error = error }
  assert(messages.every(s => !s.includes(MEMBER_CODE) && !s.includes("synthetic-only") && !s.includes(MEMBER_EMAIL)))
  w.f.onFlush(null)
  assert.equal((await webhookPost(posted(body, signature))).status, 200)
  assert.equal((await webhookPost(posted(body, signature))).status, 200)
  assert.equal(w.f.claim().events.length, 1); assert.equal(w.f.claim().state, "consumed")
})
test("truthful provider-plus-authority receipt is read only, with positive paid B/authorized A and pending/mismatched negative controls", async () => {
  for (const lane of ["A", "B"] as const) {
    const w = workflow(); await handleCheckout(request({ lane, memberCode: MEMBER_CODE }), w.deps)
    const input = { buildCode: FULL_CODE, lane, orderId: w.metadata().order_id, sessionId: "cs_test_1" }
    const status = lane === "A" ? "requires_capture" : "succeeded", provider = w.provider(status)
    assert.equal((await readOrderReceipt(input, { stripe: provider, sheet: w.f.client })).confirmed, false)
    await w.positive(status)
    const before = JSON.stringify(w.f.sheets), writes = w.f.writes.length
    const authority = w.f.dispatch("checkout_receipt", { orderId: input.orderId, intent: w.metadata().checkout_intent, binding: w.metadata().checkout_binding, session: "cs_test_1", paymentIntent: "pi_actual" })
    assert.equal(authority.ok, true, JSON.stringify({ lane, authority, row: w.f.sheets.Orders.rows[1] }))
    const receipt = await readOrderReceipt(input, { stripe: provider, sheet: w.f.client })
    assert.equal(receipt.confirmed, true); assert.equal(receipt.showWorkshop, lane === "B")
    for (const over of [{ orderId: "GG-OTHER1" }, { sessionId: "cs_test_wrong" }, { buildCode: FULL_CODE + "x" }, { lane: lane === "A" ? "B" as const : "A" as const }, { sessionId: undefined }]) assert.equal((await readOrderReceipt({ ...input, ...over }, { stripe: provider, sheet: w.f.client })).confirmed, false)
    const wrong = w.provider(status); wrong.paymentIntents.retrieve = async pi => ({ id: pi, status, metadata: { ...w.metadata(), checkout_binding: "f".repeat(64) } })
    assert.equal((await readOrderReceipt(input, { stripe: wrong, sheet: w.f.client })).confirmed, false)
    assert.equal(w.f.writes.length, writes); assert.equal(JSON.stringify(w.f.sheets), before)
    const c = w.f.claim(); c.session = "cs_test_conflict"; w.f.sheets.Orders.rows[1][43] = JSON.stringify(c)
    assert.equal((await readOrderReceipt(input, { stripe: provider, sheet: w.f.client })).confirmed, false)
  }
})
test("actual confidential authority transport binds versioned replies and never forwards a bearer or credential-bearing redirect", async () => {
  configured()
  for (const location of ["https://script.googleusercontent.com/macros/echo?key=opaque%2Bvalue", "https://script.googleusercontent.com/macros/echo?key=member%2540example.invalid", "https://script.googleusercontent.com/macros/echo?key=synthetic-only", "https://example.invalid/macros/echo"]) {
    const f = codedFixture(), input = reservation(f), sent: any[] = []; let response: any
    globalThis.fetch = async (url, init) => {
      sent.push({ url: String(url), init })
      if (init?.method === "POST") { const body = JSON.parse(String(init.body)); assert(!String(init.body).includes(MEMBER_CODE)); response = f.rawPost(body); return new Response(null, { status: 302, headers: { location } }) }
      assert.equal(init?.body, undefined); assert.equal(init?.headers, undefined); assert.equal(init?.redirect, "error"); return Response.json(response)
    }
    if (location.endsWith("opaque%2Bvalue")) { assert.equal((await sheet.reserveCheckout(input)).og, true); assert.equal(sent.length, 2) }
    else { await assert.rejects(sheet.reserveCheckout(input), /^Error: sheet_unavailable$/); assert.equal(sent.length, 1) }
  }
  for (const key of ["protocol", "intent", "binding", "requestBinding", "memberCodeMatched"]) {
    const f = codedFixture(), input = reservation(f)
    globalThis.fetch = async (_url, init) => { const value = f.rawPost(JSON.parse(String(init?.body))); value[key] = key === "memberCodeMatched" ? false : "wrong"; return Response.json(value) }
    await assert.rejects(sheet.reserveCheckout(input))
  }
  const input = reservation(codedFixture()); process.env.WAITLIST_SHEET_URL = "https://example.invalid/exec"
  let called = false; globalThis.fetch = async () => { called = true; throw Error("not allowed") }; await assert.rejects(sheet.reserveCheckout(input)); assert.equal(called, false)
})
test("receipt paths are excluded at analytics mount and beforeSend without changing ordinary public or identity routes", async () => {
  for (const path of ["/build/1.example/done", "/build/1.example/done/", "/build/1.example/%64one"]) { assert(privateReceiptPath(path)); assert.equal(allowPublicPageAnalytics("https://www.ggpc.app" + path + "?session_id=cs_test_sensitive"), false) }
  for (const url of ["https://www.ggpc.app/", "https://www.ggpc.app/builder", "https://www.ggpc.app/build/1.example", "https://www.ggpc.app/guides"]) assert.equal(allowPublicPageAnalytics(url), true)
  for (const url of ["https://www.ggpc.app/signup?flow=private", "https://www.ggpc.app/admin/usage"]) assert.equal(allowPublicPageAnalytics(url), false)
  // A sender retained across SPA transitions still rejects the new receipt URL.
  const beforeSend = (event: { url: string }) => allowPublicPageAnalytics(event.url) ? event : null
  assert(beforeSend({ url: "https://www.ggpc.app/builder" })); assert.equal(beforeSend({ url: "https://www.ggpc.app/build/1.x/done?session_id=cs_test_private" }), null)
  const sender = readFileSync(new URL("../components/public-analytics.tsx", import.meta.url), "utf8")
  assert.match(sender, /privateReceiptPath\(path\)\s*\? null/); assert.match(sender, /allowPublicPageAnalytics\(event.url\)/)
  const config = (await import("../next.config.mjs")).default, headers = await config.headers() as Array<{ source: string; headers: Array<{ key: string; value: string }> }>, receipt = headers.find(row => row.source === "/build/:code/done")!
  assert.match(receipt.headers.find(row => row.key === "Cache-Control")!.value, /no-store/); assert.equal(receipt.headers.find(row => row.key === "Referrer-Policy")!.value, "no-referrer")
})
test("portable synthetic already-bound v1 golden retains one old order and its exact provider recipe", async () => {
  const f = scriptFixture({ og: [MEMBER_EMAIL] }), captured: any[] = [], keys: string[] = []
  const row: unknown[] = V1.row.slice()
  row[2] = new Date(); row[43] = JSON.stringify({ ...V1.claim, createdAt: new Date(Date.now() - 60000).toISOString() })
  f.sheets.Orders.rows.push(row)
  const deps = { sheet: f.client, fetchQuote: async () => fullQuote(), randomInt: () => 2, stripe: { checkout: { sessions: { create: async (params: any, opts: any) => { captured.push(params); keys.push(opts.idempotencyKey); return { id: "cs_test_original", url: "https://checkout.stripe.test/original" } } } } } }
  assert.equal((await handleCheckout(request(), deps)).status, 200)
  assert.equal((await handleCheckout(request(), deps)).status, 200)
  assert.equal(f.sheets.Orders.rows.length, 2); assert.equal(f.claim().v, 1); assert.equal(f.claim().og, true)
  assert.deepEqual(captured, [V1.provider, V1.provider]); assert.deepEqual(keys, [V1.idempotencyKey, V1.idempotencyKey]); assert.equal(f.claim().session, "cs_test_original")
})

test("shared-merchant foreign/unclaimed signed events are 200 no-ops before provider or Sheet work, while real managed mismatch remains reconcilable", async () => {
  configured(); const sdk = new Stripe("sk_test_SyntheticOfflineOnly")
  let called = 0; globalThis.fetch = async () => { called++; throw Error("foreign event must not reach provider/authority") }
  for (const metadata of [{ order_id: "OTHER_PRODUCT_123" }, { order_id: "GG-ABC123" }, {}, { order_id: "OTHER_PRODUCT", checkout_intent: id, checkout_binding: "a".repeat(64) }]) {
    const body = JSON.stringify({ id: "evt_other_product", type: "checkout.session.completed", data: { object: { id: "cs_test_foreign", payment_intent: "pi_foreign", metadata } } })
    const signature = sdk.webhooks.generateTestHeaderString({ payload: body, secret: process.env.STRIPE_WEBHOOK_SECRET! })
    assert.equal((await webhookPost(new Request("https://example.invalid/api/stripe/webhook", { method: "POST", body, headers: { "stripe-signature": signature } }))).status, 200)
  }
  assert.equal(called, 0)
  const f = codedFixture(); await assert.rejects(handleEvent({ id: "evt_unknown_owned", type: "payment_intent.succeeded", data: { object: { id: "pi_unknown", metadata: { order_id: "GG-ABC123", checkout_intent: id, checkout_binding: "a".repeat(64) } } } } as any, { stripe: { paymentIntents: { retrieve: async () => { throw Error("not needed") } } }, sheet: f.client }))
  assert.equal(f.sheets.Orders.rows.length, 1)
})

test("first100 original physical membership and canonical email remain required for a new coded claim", async () => {
  const members = Array.from({ length: 100 }, (_, i) => `original${i}@example.invalid`)
  const f = scriptFixture({ og: members, waitlist: [...members, "later@example.invalid"] })
  assert.equal(f.dispatch("member_code_issue", { version: 1, email: members[99], digest: MEMBER_CREDENTIAL.digest, issuanceId: next }).ok, true)
  const w = workflow(f)
  assert.equal((await handleCheckout(request({ email: "later@example.invalid", memberCode: MEMBER_CODE }), w.deps)).status, 409)
  assert.equal((await handleCheckout(request({ email: members[99], memberCode: MEMBER_CODE }), w.deps)).status, 200)
  assert.equal(w.f.claim().og, true); assert.equal(w.f.sheets.OG.rows[100][1], 100)
  const ordinary = workflow()
  assert.equal((await handleCheckout(request({ email: "member\u0000@example.invalid" }), ordinary.deps)).status, 400)
  assert.equal(ordinary.created.length, 0); assert.equal(ordinary.f.sheets.Orders.rows.length, 1)
})
test("transport refuses stale attach and event acknowledgments even after an unknown durable write", async () => {
  configured(); const f = codedFixture(), input = reservation(f)
  globalThis.fetch = async (_url, init) => Response.json(f.rawPost(JSON.parse(String(init?.body))))
  const first = await sheet.reserveCheckout(input), ref = { orderId: first.orderId, intent: input.intent, binding: input.binding }
  globalThis.fetch = async (_url, init) => { f.rawPost(JSON.parse(String(init?.body))); return Response.json({ ok: true }) }
  await assert.rejects(sheet.attachCheckout({ ...ref, session: "cs_test_bound" })); assert.equal(f.claim().session, "cs_test_bound")
  globalThis.fetch = async (_url, init) => Response.json(f.rawPost(JSON.parse(String(init?.body))))
  await sheet.attachCheckout({ ...ref, session: "cs_test_bound" })
  globalThis.fetch = async (_url, init) => { const r = f.rawPost(JSON.parse(String(init?.body))); r.eventId = "evt_other"; return Response.json(r) }
  await assert.rejects(sheet.transitionCheckout({ ...ref, eventId: "evt_positive", order: { order_id: ref.orderId, status: "paid", stripe_session: "cs_test_bound", payment_intent: "pi_bound" } }))
  assert.equal(f.claim().state, "consumed"); assert.equal(f.claim().events.length, 1)
})

test("actual pending Done render does not confirm or display a query-shaped order ID or workshop", async () => {
  globalThis.fetch = async () => Response.json(fullQuote())
  for (const code of [FULL_CODE, "%"]) {
    const html = renderToStaticMarkup(await Done({ params: Promise.resolve({ code }), searchParams: Promise.resolve({ order: "GG-FAKE11", lane: "b", session_id: "cs_test_unconfirmed" }) }))
    assert.match(html, /Checking your order/); assert.doesNotMatch(html, /GG-FAKE11|Order received|right after you pay|Block A1-C|Deliver the parts to/)
    if (code === FULL_CODE) assert.match(html, /after payment and order confirmation/)
  }
})
