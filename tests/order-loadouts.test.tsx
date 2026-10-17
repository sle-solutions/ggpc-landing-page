import assert from "node:assert/strict"
import { test } from "node:test"
import { decodeBuildCode } from "../lib/order/build-code"
import { ORDER } from "../lib/order/config"
import { allInFils, LOADOUT_TIERS, loadoutCode, partsCapAed } from "../lib/order/loadouts"
import type { Loadout, LoadoutPart } from "../lib/order/loadouts"

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
