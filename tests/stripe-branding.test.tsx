import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { readFileSync } from "node:fs"
import Stripe from "stripe"
import { handleCheckout, type CheckoutDeps } from "../lib/order/checkout"
import { sheet, reservationRequestBinding, RESERVATION_PROTOCOL, type CheckoutReservation } from "../lib/order/sheet"
import { FULL_CODE, fullQuote } from "./order-fixtures"
import { codedFixture, MEMBER_CODE, MEMBER_CREDENTIAL, MEMBER_EMAIL } from "./stripe-members-fixture"
import V1 from "./fixtures/stripe-v1-claim.json"
import V2 from "./fixtures/stripe-v2-claims.json"

const intent = "11111111-2222-4333-8444-555555555555", next = "22222222-3333-4444-8555-666666666666"
const oldReserve = readFileSync(new URL("./fixtures/stripe-unbranded-reserve.gs", import.meta.url), "utf8")
const realFetch = globalThis.fetch
const savedEnv = [process.env.WAITLIST_SHEET_URL, process.env.WAITLIST_SHEET_SECRET]
afterEach(() => {
  globalThis.fetch = realFetch
  for (const [i, key] of ["WAITLIST_SHEET_URL", "WAITLIST_SHEET_SECRET"].entries()) {
    if (savedEnv[i] === undefined) delete process.env[key]; else process.env[key] = savedEnv[i]
  }
})
const request = (over: Record<string, unknown> = {}) => new Request("https://example.invalid/api/order/checkout", { method: "POST", body: JSON.stringify({ code: FULL_CODE, lane: "A", email: MEMBER_EMAIL, intent, addOnIds: [], ...over }) })

// The actual installed SDK serializes every provider body. Its injected fetch
// returns a synthetic response locally and never performs a network request.
function provider() {
  const bodies: Array<{ body: string; key: string | null }> = [], params: Record<string, any>[] = []
  const sessions = new Map<string, string>()
  const sdk = new Stripe("sk_test_SyntheticOfflineOnly", { maxNetworkRetries: 0, httpClient: Stripe.createFetchHttpClient(async (_url, init) => {
    const body = String(init?.body), key = new Headers(init?.headers).get("idempotency-key")
    assert(key); const prior = sessions.get(key); if (prior) assert.equal(body, prior); else sessions.set(key, body)
    bodies.push({ body, key })
    return Response.json({ id: "cs_test_original", object: "checkout.session", url: "https://checkout.stripe.test/original" })
  }) })
  const stripe: CheckoutDeps["stripe"] = { checkout: { sessions: { async create(value, options) {
    params.push(value)
    return sdk.checkout.sessions.create(value as Stripe.Checkout.SessionCreateParams, options)
  } } } }
  return { stripe, bodies, params, sessions }
}
function workflow(f = codedFixture()) {
  const p = provider(), reservations: CheckoutReservation[] = []
  let candidate = 0
  const deps: CheckoutDeps = { stripe: p.stripe, sheet: { ...f.client, reserveCheckout: async value => { reservations.push(value); return f.client.reserveCheckout(value) } }, fetchQuote: async () => fullQuote(), randomInt: () => ++candidate % 30 }
  return { f, p, deps, reservations }
}
const records = [
  { lane: "A", row: V1.row, claim: V1.claim, provider: V1.provider, options: { idempotencyKey: V1.idempotencyKey } },
  ...V2.records,
]
function historical(record: typeof records[number], unattached = false) {
  const f = codedFixture(), row: unknown[] = record.row.slice(), claim = { ...record.claim, createdAt: new Date(Date.now() - 60000).toISOString() }
  if ("memberCode" in claim) f.sheets.OG.rows[1][4] = claim.memberCode.issuedAt
  if (unattached) { claim.session = ""; row[21] = "" }
  row[1] = new Date(Date.now() - 60000); row[2] = new Date(); row[43] = JSON.stringify(claim)
  row[f.headers.indexOf("Notes")] = "preserve manual notes"
  f.sheets.Orders.rows.push(row)
  return workflow(f)
}

test("bound v1 and v2 retries retain byte-exact SDK request bodies and keys, including an unknown provider result", async () => {
  for (const record of records) for (const unknown of [false, true]) {
    const w = historical(record, unknown), expected = provider()
    await expected.stripe!.checkout.sessions.create(record.provider, record.options)
    const over = { lane: record.lane, ...(record.claim.v === 2 ? { memberCode: MEMBER_CODE } : {}) }
    if (unknown) {
      const create = w.deps.stripe!.checkout.sessions.create; let once = true
      w.deps.stripe!.checkout.sessions.create = async (...args) => { const result = await create(...args); if (once) { once = false; throw Error("unknown after provider create") } return result }
      assert.equal((await handleCheckout(request(over), w.deps)).status, 502)
      assert.equal(w.f.claim().session, ""); assert.equal(w.f.claim().state, "held")
    }
    for (let i = 0; i < 2; i++) assert.equal((await handleCheckout(request(over), w.deps)).status, 200)
    for (const value of w.p.params) assert.equal(JSON.stringify(value), JSON.stringify(record.provider))
    for (const body of w.p.bodies) assert.deepEqual(body, expected.bodies[0])
    assert.equal(w.f.claim().binding, record.claim.binding); assert.equal(w.f.claim().v, record.claim.v)
    assert.equal(w.f.claim().session, "cs_test_original"); assert.equal(w.f.claim().state, "held")
    assert.equal(w.f.sheets.Orders.rows.length, 2); assert.equal(w.p.sessions.size, 1)
    assert.equal(w.f.sheets.Orders.rows[1][w.f.headers.indexOf("Notes")], "preserve manual notes")
    assert(w.p.params.every(value => !Object.hasOwn(value, "branding_settings")))
  }
})

test("new ordinary and coded attempts bind only GG PC header branding and retain the exact branded recipe through unknown create or attach", async () => {
  for (const lane of ["A", "B"]) for (const coded of [false, true]) for (const failure of ["create", "attach"]) {
    const w = workflow(), over = { lane, ...(coded ? { memberCode: MEMBER_CODE } : {}) }
    let once = true
    if (failure === "create") {
      const create = w.deps.stripe!.checkout.sessions.create
      w.deps.stripe!.checkout.sessions.create = async (...args) => { const result = await create(...args); if (once) { once = false; throw Error("unknown create") } return result }
    } else {
      const attach = w.deps.sheet!.attachCheckout
      w.deps.sheet!.attachCheckout = async value => { const result = await attach(value); if (once) { once = false; throw Error("unknown attach") } return result }
    }
    const first = await handleCheckout(request(over), w.deps)
    assert.equal(first.status, 502); assert.deepEqual(await first.json(), { error: "checkout_failed" })
    assert.equal((await handleCheckout(request(over), w.deps)).status, 200)
    const [primary, replay] = w.reservations, claim = w.f.claim(), params = w.p.params[0]
    assert.notEqual(primary.binding, primary.legacyBinding); assert.equal(claim.binding, primary.binding)
    assert.equal(replay.binding, primary.binding); assert.equal(replay.legacyBinding, primary.legacyBinding)
    assert.equal(claim.v, coded ? 2 : 1); assert.equal(claim.og, coded)
    assert.deepEqual(params.branding_settings, { display_name: "GG PC" })
    assert.equal(params.payment_intent_data.capture_method, lane === "A" ? "manual" : undefined)
    assert.equal(params.payment_intent_data.statement_descriptor_suffix, "GGPC")
    assert.deepEqual(params.managed_payments, { enabled: false })
    assert.equal(params.line_items.reduce((sum: number, line: any) => sum + line.price_data.unit_amount, 0), lane === "A" ? coded ? 793200 : 801900 : coded ? 55400 : 59900)
    assert.equal(params.metadata.checkout_binding, claim.binding)
    assert.equal(new URLSearchParams(w.p.bodies[0].body).get("branding_settings[display_name]"), "GG PC")
    assert.deepEqual(w.p.bodies[0], w.p.bodies[1]); assert.equal(JSON.stringify(w.p.params[0]), JSON.stringify(w.p.params[1]))
    assert.equal(w.f.sheets.Orders.rows.length, 2); assert.equal(w.p.sessions.size, 1)
    assert.equal(w.f.headers.length, 44); assert.equal(claim.state, "held")
    assert.equal(JSON.stringify(params).includes(MEMBER_CODE), false)
  }
})

function configured() {
  process.env.WAITLIST_SHEET_URL = "https://script.google.com/macros/s/SYNTHETIC_DEPLOYMENT/exec"
  process.env.WAITLIST_SHEET_SECRET = "synthetic-only"
}
function input(): CheckoutReservation {
  return { intent, binding: "a".repeat(64), legacyBinding: "b".repeat(64), email: MEMBER_EMAIL, memberCode: MEMBER_CREDENTIAL, order: { order_id: "GG-ABC123", email: MEMBER_EMAIL, status: "checkout_started", og_applied: false }, ogOrder: { order_id: "GG-ABC123", email: MEMBER_EMAIL, status: "checkout_started", og_applied: true } }
}
test("paired transport positively selects the existing binding but rejects new legacy selection, mismatched pair replies and stale correlation", async () => {
  configured()
  const f = codedFixture(), first = input()
  globalThis.fetch = async (_url, init) => Response.json(f.rawPost(JSON.parse(String(init?.body))))
  assert.equal((await sheet.reserveCheckout(first)).binding, first.binding)
  const replay = { ...first, binding: "c".repeat(64), legacyBinding: first.binding }
  assert.equal((await sheet.reserveCheckout(replay)).binding, first.binding)
  const before = JSON.stringify(f.sheets.Orders.rows)
  const stale = { ...replay, legacyBinding: "d".repeat(64), protocol: RESERVATION_PROTOCOL, requestBinding: reservationRequestBinding(replay) }
  assert.equal(f.dispatch("checkout_reserve_v2", stale).ok, false)
  assert.equal(JSON.stringify(f.sheets.Orders.rows), before)
  for (const mutate of [
    (r: any, c: CheckoutReservation) => { r.binding = c.legacyBinding; r.replayed = false },
    (r: any) => { r.binding = "f".repeat(64) },
    (r: any) => { r.requestBinding = reservationRequestBinding(first) },
    (r: any) => { r.intent = next },
    (r: any) => { r.memberCodeMatched = false },
  ]) {
    globalThis.fetch = async (_url, init) => { const body = JSON.parse(String(init?.body)), result = f.rawPost(body); assert.equal(result.ok, true); mutate(result, body.checkout); return Response.json(result) }
    await assert.rejects(sheet.reserveCheckout(replay), /sheet_unavailable/)
  }
  assert.equal(JSON.stringify(f.sheets.Orders.rows), before)
})

test("historical paired retries cannot change the email, code, intent, quote, binding or provider session", async () => {
  for (const record of V2.records) {
    const w = historical(record), over = { lane: record.lane, memberCode: MEMBER_CODE }
    assert.equal((await handleCheckout(request(over), w.deps)).status, 200)
    const before = JSON.stringify(w.f.sheets.Orders.rows), count = w.p.bodies.length
    for (const change of [{ email: "other@example.invalid" }, { memberCode: "GGPC-OG-" + Buffer.alloc(32, 2).toString("base64url") }, { intent: next }, { memberCode: undefined }]) assert.notEqual((await handleCheckout(request({ ...over, ...change }), w.deps)).status, 200)
    w.deps.fetchQuote = async () => { const q = fullQuote(); q.parts[0].chosen!.price! += 1; return q }
    assert.equal((await handleCheckout(request(over), w.deps)).status, 502)
    const selected = w.reservations[0]
    await assert.rejects(w.f.client.reserveCheckout({ ...selected, binding: "e".repeat(64), legacyBinding: "f".repeat(64) }))
    await assert.rejects(w.f.client.attachCheckout({ orderId: record.claim.orderId, intent, binding: record.claim.binding, session: "cs_test_replacement" }))
    assert.equal(w.p.bodies.length, count); assert.equal(JSON.stringify(w.f.sheets.Orders.rows), before)
  }
})

test("deployment overlap rejects paired requests at the actual old Script without fallback and rejects new marker-absent claims at the new Script", async () => {
  for (const coded of [false, true]) {
    const f = codedFixture({ reserveSource: oldReserve }), w = workflow(f), over = coded ? { memberCode: MEMBER_CODE } : {}
    const before = JSON.stringify(f.sheets.Orders.rows)
    assert.equal((await handleCheckout(request(over), w.deps)).status, 502)
    assert.equal(w.p.bodies.length, 0); assert.equal(JSON.stringify(f.sheets.Orders.rows), before)
    // Positive control: these exact old functions admit a historical old body.
    const old = { ...input(), memberCode: coded ? MEMBER_CREDENTIAL : null }; delete old.legacyBinding
    assert.equal((await f.client.reserveCheckout(old)).ok, true)
    const current = codedFixture({ legacyHeaders: true }), snapshot = JSON.stringify(current.sheets.Orders.rows)
    await assert.rejects(current.client.reserveCheckout(old))
    assert.equal(JSON.stringify(current.sheets.Orders.rows), snapshot)
    assert.equal(current.sheets.Orders.rows[0].length, 43)
  }
  for (const record of records) {
    const w = historical(record), over = { lane: record.lane, ...(record.claim.v === 2 ? { memberCode: MEMBER_CODE } : {}) }
    assert.equal((await handleCheckout(request(over), w.deps)).status, 200)
    const paired = w.reservations[0], old = { ...paired, binding: paired.legacyBinding! }; delete old.legacyBinding
    const value = w.f.dispatch("checkout_reserve_v2", { ...old, protocol: RESERVATION_PROTOCOL, requestBinding: reservationRequestBinding(old) })
    assert.equal(value.ok, true); assert.equal(value.replayed, true); assert.equal(value.binding, record.claim.binding)
    if (record.claim.v === 1) {
      const { memberCode: _memberCode, ...legacy } = old
      const response = w.f.dispatch("checkout_reserve", legacy)
      assert.deepEqual(Object.keys(response).sort(), ["og", "ok", "orderId", "replayed"])
      assert.equal(response.orderId, record.claim.orderId)
    }
    assert.equal(w.f.sheets.Orders.rows.length, 2)
  }
})
