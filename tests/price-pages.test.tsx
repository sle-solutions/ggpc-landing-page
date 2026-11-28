import assert from "node:assert/strict"
import { test } from "node:test"
import { cheapestPerStore, chipName, chipBrand, chipPath, dailyLows, groupChips, MAX_OFFER_AGE_MS, slugFromParam, summarize, verdict } from "../lib/prices/catalog"

const now = Date.parse("2026-11-28T12:00:00Z")
const recent = new Date(now - 3600_000).toISOString()
const price = (store: string, amount: number, opts: { inStock?: boolean; lastChecked?: string; url?: string } = {}) =>
  ({ price: amount, inStock: opts.inStock ?? true, url: opts.url ?? `https://www.example.ae/${store}/${amount}`, lastChecked: opts.lastChecked ?? recent, store: { name: store } })
const comp = (id: string, modelKey: string | null, prices: unknown[], category = "GPU") => ({ id, name: `Card ${id}`, category, modelKey, prices })

test("chip names follow retail spelling", () => {
  assert.equal(chipName("rtx-5060-ti-16gb"), "RTX 5060 Ti 16GB")
  assert.equal(chipName("rx-9070-xt"), "RX 9070 XT")
  assert.equal(chipName("ryzen-7-9800x3d"), "Ryzen 7 9800X3D")
  assert.equal(chipName("core-i5-12400f"), "Core i5-12400F")
  assert.equal(chipName("core-ultra-7-265kf"), "Core Ultra 7 265KF")
  assert.equal(chipName("arc-b570"), "Arc B570")
  assert.equal(chipBrand("GPU", "rx-9070-xt"), "AMD Radeon")
  assert.equal(chipBrand("GPU", "rtx-5070"), "NVIDIA GeForce")
  assert.equal(chipBrand("CPU", "core-i5-12400f"), "Intel")
})

test("page URLs round trip and reject anything else", () => {
  assert.equal(chipPath("rtx-5070"), "/price/rtx-5070-uae")
  assert.equal(slugFromParam("rtx-5070-uae"), "rtx-5070")
  assert.equal(slugFromParam("rtx-5070"), null)
  assert.equal(slugFromParam("RTX-5070-uae"), null)
  assert.equal(slugFromParam("../x-uae"), null)
})

test("listings group by chip, never by near misses, unknown keys or other categories", () => {
  const chips = groupChips("GPU", [
    comp("a", "gpu:rtx-5070:asus:prime-oc", [price("amazon_ae", 3300), price("noon", 3500)]),
    comp("b", "gpu:rtx-5070:gigabyte:eagle", [price("microless", 3600)]),
    comp("c", "gpu:rtx-5070-ti:asus:tuf", [price("noon", 4200)]),
    comp("d", null, [price("noon", 100)]),
    comp("e", "psu:asus", [price("noon", 200)]),
    comp("f", "cpu:ryzen-5-7600", [price("noon", 700)], "CPU"),
  ], now)
  assert.deepEqual(chips.map(c => c.slug).sort(), ["rtx-5070", "rtx-5070-ti"])
  const s = summarize(chips.find(c => c.slug === "rtx-5070")!)
  assert.equal(s.cheapest.price, 3300)
  assert.equal(s.cards, 2)
  assert.equal(s.stores, 3)
})

test("stale, unknown-store, non-https and zero prices are never shown", () => {
  const stale = new Date(now - MAX_OFFER_AGE_MS - 60_000).toISOString()
  const future = new Date(now + 3600_000).toISOString()
  const [chip] = groupChips("GPU", [comp("a", "gpu:rtx-5070:asus:x", [
    price("amazon_ae", 1000, { lastChecked: stale }),
    price("amazon_ae", 1100, { lastChecked: future }),
    price("pcdubai", 1200),
    price("noon", 1300, { url: "http://www.noon.com/x" }),
    price("noon", 0),
    price("gear_up", 3900),
  ])], now)
  assert.deepEqual(chip.offers.map(o => o.price), [3900])
})

test("a chip with only out-of-stock offers gets no page; in-stock sorts before cheaper out-of-stock", () => {
  assert.equal(groupChips("GPU", [comp("a", "gpu:rtx-5090:asus:x", [price("noon", 9000, { inStock: false })])], now).length, 0)
  const [chip] = groupChips("GPU", [comp("a", "gpu:rtx-5080:asus:x", [price("noon", 4000, { inStock: false }), price("microless", 4500), price("gear_up", 4400)])], now)
  assert.deepEqual(chip.offers.map(o => o.price), [4400, 4500, 4000])
  assert.deepEqual(cheapestPerStore(chip).map(o => o.retailer), ["gear_up", "microless"])
})

test("daily lows use in-stock points per Dubai day and include today's live price", () => {
  const h = dailyLows([
    { price: 3500, inStock: true, recordedAt: "2026-11-13T19:00:00Z" },
    { price: 3400, inStock: true, recordedAt: "2026-11-13T21:00:00Z" }, // 01:00 on 14 Nov in Dubai
    { price: 3000, inStock: false, recordedAt: "2026-11-15T10:00:00Z" },
    { price: 3600, inStock: true, recordedAt: "2026-11-15T10:00:00Z" },
  ], { price: 3550, day: "2026-11-28" })
  assert.deepEqual(h.days, [{ day: "2026-11-13", price: 3500 }, { day: "2026-11-14", price: 3400 }, { day: "2026-11-15", price: 3600 }, { day: "2026-11-28", price: 3550 }])
  assert.equal(h.first, "2026-11-13")
  assert.deepEqual(h.low, { day: "2026-11-14", price: 3400 })
})

test("verdict waits for a week of history, then calls at or above the low", () => {
  const short = dailyLows([{ price: 3000, inStock: true, recordedAt: "2026-11-25T08:00:00Z" }], { price: 3100, day: "2026-11-28" })
  assert.equal(verdict(short, 3100, "2026-11-28").kind, "new")
  const long = dailyLows([{ price: 3000, inStock: true, recordedAt: "2026-11-13T08:00:00Z" }], { price: 3020, day: "2026-11-28" })
  assert.equal(verdict(long, 3020, "2026-11-28").kind, "at_low")
  const above = dailyLows([{ price: 3000, inStock: true, recordedAt: "2026-11-13T08:00:00Z" }], { price: 3300, day: "2026-11-28" })
  assert.deepEqual(verdict(above, 3300, "2026-11-28"), { kind: "above_low", since: "2026-11-13", low: { day: "2026-11-13", price: 3000 }, above: 300 })
})

test("listings under half the chip median are dropped as bad data", () => {
  const [chip] = groupChips("CPU", [
    comp("a", "cpu:ryzen-7-9800x3d:box", [price("amazon_ae", 1700), price("noon", 1750), price("microless", 107.21)], "CPU"),
    comp("b", "cpu:ryzen-7-9800x3d:tray", [price("gear_up", 1650)], "CPU"),
  ], now)
  assert.deepEqual(chip.offers.map(o => o.price), [1650, 1700, 1750])
})

test("history points outside half to double the median never set the low", () => {
  const h = dailyLows([
    { price: 107.21, inStock: true, recordedAt: "2026-11-20T08:00:00Z" },
    { price: 9000, inStock: true, recordedAt: "2026-11-21T08:00:00Z" },
    { price: 1600, inStock: true, recordedAt: "2026-11-22T08:00:00Z" },
  ], { price: 1650, day: "2026-11-28" }, 1700)
  assert.deepEqual(h.low, { day: "2026-11-22", price: 1600 })
  assert.equal(h.days.length, 2)
})
