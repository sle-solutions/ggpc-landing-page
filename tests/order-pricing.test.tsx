import assert from "node:assert/strict"
import { test } from "node:test"
import { decodeBuildCode } from "../lib/order/build-code"
import { computeTotals, estimateStripeFeeFils, laneStatus } from "../lib/order/pricing"
import { ORDER } from "../lib/order/config"
import { FULL_CODE, fullQuote, GOLDEN_CODE } from "./order-fixtures"

const build = (() => { const r = decodeBuildCode(FULL_CODE); if (!r.ok) throw new Error("fixture"); return r.build })()
const workshop = { name: "GG PC Workshop", lines: ["Somewhere"], phone: "+971" }

test("fees: 6% sourcing, AED 450 build fee, AED 149 protection, totals in fils", () => {
  const t = computeTotals({ lane: "A", quote: fullQuote(), addOnIds: [], og: false })
  assert.ok(!("error" in t))
  if ("error" in t) return
  assert.equal(t.partsFils, 7 * 100000) // seven priced parts at AED 1,000, cooler skipped
  assert.equal(t.sourcingFils, 42000)
  assert.equal(t.buildFils, 45000)
  assert.equal(t.protectionFils, 14900)
  assert.equal(t.totalFils, 700000 + 42000 + 45000 + 14900)
  assert.ok(t.lines.some(l => l.name === "Buyer protection" && l.amountFils === 14900))
  assert.equal(t.lines.reduce((s, l) => s + l.amountFils, 0), t.totalFils)
  assert.match(t.lines[0].name, /^CPU: CPU part \(Amazon\.ae\)$/)
})

test("OG discount touches the service lines only, and Stripe lines still sum to the total", () => {
  const t = computeTotals({ lane: "A", quote: fullQuote(), addOnIds: [], og: true })
  if ("error" in t) throw new Error("unexpected")
  assert.equal(t.ogDiscountFils, Math.round((42000 + 45000) * 0.1))
  assert.equal(t.partsFils, 700000)
  assert.equal(t.totalFils, 700000 + 42000 + 45000 + 14900 - t.ogDiscountFils)
  assert.equal(t.lines.find(l => l.name === "Buyer protection")?.amountFils, 14900) // never discounted
  assert.equal(t.lines.reduce((s, l) => s + l.amountFils, 0), t.totalFils)
  assert.ok(t.lines.filter(l => /fee/i.test(l.name)).every(l => l.description === ORDER.perkCopy))
  assert.notEqual(t.lines.find(l => l.name === "Buyer protection")?.description, ORDER.perkCopy)
  assert.ok(t.lines.filter(l => /^(CPU|GPU)/.test(l.name)).every(l => l.description === undefined))
})

test("Lane B has no parts and no sourcing fee, but pays protection", () => {
  const t = computeTotals({ lane: "B", quote: fullQuote(), addOnIds: [], og: false })
  if ("error" in t) throw new Error("unexpected")
  assert.equal(t.partsFils, 0)
  assert.equal(t.sourcingFils, 0)
  assert.equal(t.totalFils, 45000 + 14900)
})

test("unknown add-ons are ignored; priced add-ons are charged at full price", () => {
  const t = computeTotals({ lane: "B", quote: fullQuote(), addOnIds: ["nope"], og: false })
  if ("error" in t) throw new Error("unexpected")
  assert.equal(t.addOnsFils, 0)
  const priced = ORDER.addOns.filter(a => a.priceFils)
  const t2 = computeTotals({ lane: "B", quote: fullQuote(), addOnIds: priced.map(a => a.id), og: true })
  if ("error" in t2) throw new Error("unexpected")
  assert.equal(t2.addOnsFils, priced.reduce((sum, a) => sum + (a.priceFils ?? 0), 0)) // OG never discounts add-ons
})

test("refuses to quote below the labour floor", () => {
  const original = ORDER.buildFeeFils
  ;(ORDER as { buildFeeFils: number }).buildFeeFils = 18000 // AED 180: about AED 161 net of fees passes; 10% off leaves about AED 144 < 150
  try {
    assert.deepEqual(computeTotals({ lane: "B", quote: fullQuote(), addOnIds: [], og: true }), { error: "below_floor" })
    assert.ok(!("error" in computeTotals({ lane: "B", quote: fullQuote(), addOnIds: [], og: false })))
  } finally { (ORDER as { buildFeeFils: number }).buildFeeFils = original }
})

test("Lane A blocks on stale, out of stock, unpriced and unknown parts", () => {
  assert.deepEqual(laneStatus(fullQuote(), build, "A"), { ok: true })
  for (const status of ["stale", "out_of_stock", "unpriced"] as const) {
    assert.deepEqual(laneStatus(fullQuote({}, { GPU: { status } }), build, "A"), { ok: false, reason: "parts_not_ok" }, status)
  }
  const unknown = fullQuote()
  unknown.parts[5] = { slot: "GPU", status: "unknown", chosen: null, candidates: [], componentId: null, category: null }
  assert.deepEqual(laneStatus(unknown, build, "A"), { ok: false, reason: "unknown_parts" })
})

test("a skipped cooler is fine; a missing core part is incomplete", () => {
  const golden = decodeBuildCode(GOLDEN_CODE)
  assert.ok(golden.ok)
  if (golden.ok) assert.deepEqual(laneStatus(fullQuote(), golden.build, "A"), { ok: false, reason: "incomplete" })
})

test("Lane B needs the workshop address and a store link per part", () => {
  assert.deepEqual(laneStatus(fullQuote(), build, "B", null), { ok: false, reason: "no_workshop" })
  assert.deepEqual(laneStatus(fullQuote(), build, "B", workshop), { ok: true })
  assert.deepEqual(laneStatus(fullQuote({}, { CASE: { status: "stale" } }), build, "B", workshop), { ok: true }, "stale prices are fine when the customer buys")
  assert.deepEqual(laneStatus(fullQuote({}, { CASE: { url: null } }), build, "B", workshop), { ok: false, reason: "unknown_parts" })
})

test("Stripe fee estimate: 5.4% plus AED 1.10, rounded", () => {
  assert.equal(estimateStripeFeeFils(0), 110)
  assert.equal(estimateStripeFeeFils(100000), 5400 + 110)
  assert.equal(estimateStripeFeeFils(812500), Math.round(812500 * 0.054) + 110)
})

test("Totals expose the fee estimate and net service (internal)", () => {
  const t = computeTotals({ lane: "A", quote: fullQuote(), addOnIds: [], og: true })
  if ("error" in t) throw new Error("unexpected")
  assert.equal(t.stripeFeeEstimateFils, estimateStripeFeeFils(t.totalFils))
  assert.equal(t.netServiceFils, t.serviceFils - t.ogDiscountFils - t.stripeFeeEstimateFils)
  assert.ok(!t.lines.some(l => /stripe|processing/i.test(l.name)))
})

test("Lane B with the AED 450 build fee passes, with and without OG", () => {
  for (const og of [false, true]) {
    const t = computeTotals({ lane: "B", quote: fullQuote(), addOnIds: [], og })
    assert.ok(!("error" in t), String(og))
  }
})

test("sourcing line label comes from the config rate", () => {
  const t = computeTotals({ lane: "A", quote: fullQuote(), addOnIds: [], og: false })
  if ("error" in t) throw new Error("unexpected")
  assert.ok(t.lines.some(l => l.name === "Sourcing fee (6% of parts)"))
})

test("refuses when Stripe fees push net service under the AED 150 floor", () => {
  const original = ORDER.stripeFeeRate
  ;(ORDER as { stripeFeeRate: number }).stripeFeeRate = 0.4 // Lane B: 450 - 0.4 * 599 - 1.10 = ~209 passes; Lane A total is large so fees dominate
  try {
    assert.deepEqual(computeTotals({ lane: "A", quote: fullQuote(), addOnIds: [], og: false }), { error: "below_floor" })
    assert.ok(!("error" in computeTotals({ lane: "B", quote: fullQuote(), addOnIds: [], og: false })))
  } finally { (ORDER as { stripeFeeRate: number }).stripeFeeRate = original }
})
