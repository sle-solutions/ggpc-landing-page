import assert from "node:assert/strict"
import { test } from "node:test"
import { decodeBuildCode } from "../lib/order/build-code"
import { computeTotals, laneStatus } from "../lib/order/pricing"
import { ORDER } from "../lib/order/config"
import { FULL_CODE, fullQuote, GOLDEN_CODE } from "./order-fixtures"

const build = (() => { const r = decodeBuildCode(FULL_CODE); if (!r.ok) throw new Error("fixture"); return r.build })()
const workshop = { name: "GG PC Workshop", lines: ["Somewhere"], phone: "+971" }

test("fees: 8% sourcing, AED 399 build fee, totals in fils", () => {
  const t = computeTotals({ lane: "A", quote: fullQuote(), addOnIds: [], og: false })
  assert.ok(!("error" in t))
  if ("error" in t) return
  assert.equal(t.partsFils, 7 * 100000) // seven priced parts at AED 1,000, cooler skipped
  assert.equal(t.sourcingFils, 56000)
  assert.equal(t.buildFils, 39900)
  assert.equal(t.totalFils, 700000 + 56000 + 39900)
  assert.equal(t.lines.reduce((s, l) => s + l.amountFils, 0), t.totalFils)
  assert.match(t.lines[0].name, /^CPU: CPU part \(Amazon\.ae\)$/)
})

test("OG discount touches the service lines only, and Stripe lines still sum to the total", () => {
  const t = computeTotals({ lane: "A", quote: fullQuote(), addOnIds: [], og: true })
  if ("error" in t) throw new Error("unexpected")
  assert.equal(t.ogDiscountFils, Math.round((56000 + 39900) * 0.1))
  assert.equal(t.partsFils, 700000)
  assert.equal(t.totalFils, 700000 + 56000 + 39900 - t.ogDiscountFils)
  assert.equal(t.lines.reduce((s, l) => s + l.amountFils, 0), t.totalFils)
  assert.ok(t.lines.filter(l => /fee/i.test(l.name)).every(l => l.description === ORDER.perkCopy))
  assert.ok(t.lines.filter(l => /^(CPU|GPU)/.test(l.name)).every(l => l.description === undefined))
})

test("Lane B has no parts and no sourcing fee", () => {
  const t = computeTotals({ lane: "B", quote: fullQuote(), addOnIds: [], og: false })
  if ("error" in t) throw new Error("unexpected")
  assert.equal(t.partsFils, 0)
  assert.equal(t.sourcingFils, 0)
  assert.equal(t.totalFils, 39900)
})

test("unpriced or unknown add-ons are ignored", () => {
  const t = computeTotals({ lane: "B", quote: fullQuote(), addOnIds: ["delivery_uae", "nope"], og: false })
  if ("error" in t) throw new Error("unexpected")
  assert.equal(t.addOnsFils, 0)
})

test("refuses to quote below the labour floor", () => {
  const original = ORDER.buildFeeFils
  ;(ORDER as { buildFeeFils: number }).buildFeeFils = 16000 // 160 AED, 10% off leaves 144 < 150
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
