import assert from "node:assert/strict"
import { test } from "node:test"
import { decodeBuildCode } from "../lib/order/build-code"
import { ORDER } from "../lib/order/config"
import { allInFils, LOADOUT_TIERS, loadoutCode, partsCapAed, fetchLoadouts, loadoutAgeSeconds } from "../lib/order/loadouts"
import type { Loadout, LoadoutPart } from "../lib/order/loadouts"
import { renderToStaticMarkup } from "react-dom/server"
import BuilderPage from "../app/builder/page"

const part = (slot: LoadoutPart["slot"], sku: string, alternates: LoadoutPart["alternates"] = []): LoadoutPart =>
  ({ slot, componentId: sku, name: sku, title: sku, retailer: "amazon_ae", retailerSku: sku, price: 100, url: "https://example.test", ageSeconds: 60, alternates })

const loadout = (parts: LoadoutPart[]): Loadout => ({ budget: 4000, partsTotal: 700, gpu: "RTX 4060", cpu: "Ryzen 5 5600", fit: "ok", notes: [], parts })

test("the parts cap keeps the all-in total within every tier budget", () => {
  for (const t of LOADOUT_TIERS) {
    const cap = partsCapAed(t.budgetAed)
    assert.ok(allInFils(cap).totalFils <= t.budgetAed * 100, t.id)
    assert.ok(allInFils(cap + 2).totalFils > t.budgetAed * 100, `${t.id}: cap should be tight`)
  }
})

test("all-in total = parts + sourcing + build fee + buyer protection", () => {
  const t = allInFils(2959.67)
  assert.equal(t.partsFils, 295967)
  assert.equal(t.sourcingFils, Math.round(295967 * ORDER.sourcingFeeRate))
  assert.equal(t.totalFils, 295967 + t.sourcingFils + ORDER.buildFeeFils + ORDER.protectionFeeFils)
})

test("loadout codes decode on the order page, with alternates and a skipped boxed cooler", () => {
  const l = loadout([part("CPU", "C1"), part("MOTHERBOARD", "M1"), part("RAM", "R1"), part("STORAGE", "S1"),
    part("GPU", "G1", [{ retailer: "noon", retailerSku: "N1" }, { retailer: "microless", retailerSku: "X1" }]), part("POWER_SUPPLY", "P1"), part("CASE", "K1")])
  const decoded = decodeBuildCode(loadoutCode("GG PC Mid loadout", l))
  assert.ok(decoded.ok)
  if (!decoded.ok) return
  assert.equal(decoded.build.name, "GG PC Mid loadout")
  assert.deepEqual(decoded.build.parts.map(p => p.slot), ["CPU", "CPU_COOLER", "MOTHERBOARD", "RAM", "STORAGE", "GPU", "POWER_SUPPLY", "CASE"])
  assert.equal(decoded.build.parts[1].candidates.length, 0)
  assert.deepEqual(decoded.build.parts[5].candidates, [{ retailer: "amazon_ae", retailerSku: "G1" }, { retailer: "noon", retailerSku: "N1" }, { retailer: "microless", retailerSku: "X1" }])
})

test("a picked cooler is kept, not doubled", () => {
  const decoded = decodeBuildCode(loadoutCode("x", loadout([part("CPU", "C1"), part("CPU_COOLER", "F1"), part("GPU", "G1")])))
  assert.ok(decoded.ok && decoded.build.parts.filter(p => p.slot === "CPU_COOLER").length === 1)
})

test("cleanTitle repairs double-encoded store titles", async () => {
  const { cleanTitle } = await import("../lib/order/format")
  assert.equal(cleanTitle("Fan (650â\u0080\u00931750 RPM)"), "Fan (650-1750 RPM)")
  assert.equal(cleanTitle("Itâ€™s ASUSÂ® TUFâ„¢"), "It's ASUS® TUF™")
  assert.equal(cleanTitle("Ryzen 7 9800X3D  Processor"), "Ryzen 7 9800X3D Processor")
})

test("cached API observation ages advance across hour boundaries without changing provenance", () => {
  const generated = "2026-11-06T07:00:00.000Z", now = Date.parse("2026-11-06T11:00:00.000Z")
  assert.equal(loadoutAgeSeconds(60, generated, now), 14460)
  assert.equal(loadoutAgeSeconds(60, generated, Date.parse(generated) - 1000), 60)
})

test("unknown or malformed age data cannot produce a fresh observation label", () => {
  for (const age of [-1, NaN, Infinity]) assert.equal(loadoutAgeSeconds(age, "2026-11-06T07:00:00.000Z"), null)
  assert.equal(loadoutAgeSeconds(60, "not-a-date"), null)
  assert.equal(loadoutAgeSeconds(60, "2026-11-06T07:00:00.000Z", NaN), null)
})

test("builder reads bypass Next response caching while retaining the API generation and raw ages", async () => {
  const old = globalThis.fetch, generatedAt = "2026-11-06T07:00:00.000Z", picked = loadout([part("CPU", "C1")])
  let options: RequestInit | undefined
  globalThis.fetch = async (_url, init) => { options = init; return Response.json({ generatedAt, loadouts: Array(4).fill(picked) }) }
  try {
    const result = await fetchLoadouts()
    assert.equal(options?.cache, "no-store")
    assert.equal(options && "next" in options, false)
    assert.ok(!("error" in result))
    if ("error" in result) return
    assert.equal(result.generatedAt, generatedAt)
    const item = result.loadouts[0]; assert.ok(!("error" in item))
    if (!("error" in item)) assert.equal(item.parts[0].ageSeconds, 60)
  } finally { globalThis.fetch = old }
})

test("builder rejects invalid generation or negative observation ages", async () => {
  const old = globalThis.fetch
  try {
    for (const data of [
      { generatedAt: "invalid", loadouts: Array(4).fill(loadout([part("CPU", "C1")])) },
      { generatedAt: "2026-11-06T07:00:00.000Z", loadouts: Array(4).fill(loadout([{ ...part("CPU", "C1"), ageSeconds: -1 }])) },
    ]) {
      globalThis.fetch = async () => Response.json(data)
      assert.deepEqual(await fetchLoadouts(), { error: "api_down" })
    }
  } finally { globalThis.fetch = old }
})

test("the actual builder renders a cached generation's elapsed age instead of repeating its old age", async () => {
  const oldFetch = globalThis.fetch, oldNow = Date.now
  const picked = loadout([part("CPU", "C1")])
  globalThis.fetch = async () => Response.json({ generatedAt: "2026-11-06T07:00:00.000Z", loadouts: Array(4).fill(picked) })
  Date.now = () => Date.parse("2026-11-06T11:00:00.000Z")
  try {
    const html = renderToStaticMarkup(await BuilderPage({ searchParams: Promise.resolve({ tier: "mid" }) }))
    assert.match(html, /seen 4 h ago/)
    assert.doesNotMatch(html, /seen 1 min ago/)
  } finally { globalThis.fetch = oldFetch; Date.now = oldNow }
})
