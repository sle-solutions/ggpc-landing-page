import assert from "node:assert/strict"
import { test } from "node:test"
import { catalogPart } from "../lib/order/builder-catalog"
import { suggestBuild } from "../app/builder/actions"
import { partsCapAed } from "../lib/order/loadouts"
import { renderToStaticMarkup } from "react-dom/server"
import BuilderPage from "../app/builder/page"

test("the default builder starts empty and allows part selection without a loadout request", async () => {
  const previous = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; throw Error("unexpected request") }
  try {
    const html = renderToStaticMarkup(await BuilderPage({ searchParams: Promise.resolve({}) }))
    assert.equal(calls, 0)
    assert.match(html, /Your total budget/)
    assert.equal((html.match(/aria-label="Choose /g) ?? []).length, 8)
    assert.doesNotMatch(html, /href="\/build\//)
  } finally { globalThis.fetch = previous }
})

test("custom suggestions request the entered budget after fees and keep an empty result explicit", async () => {
  const previous = globalThis.fetch
  let url = ""
  globalThis.fetch = async input => {
    url = String(input)
    return Response.json({ generatedAt: new Date().toISOString(), loadouts: [{ budget: partsCapAed(6321), error: "nothing_fits" }] })
  }
  try {
    assert.match((await suggestBuild(6321)).error ?? "", /No complete suggestion/)
    assert.equal(new URL(url).searchParams.get("budgets"), String(partsCapAed(6321)))
  } finally { globalThis.fetch = previous }
})

test("the catalog picker only offers an eligible part with its own recent UAE listing and exact SKU", () => {
  const now = Date.parse("2026-11-19T12:00:00Z")
  const offer = { store: { name: "amazon_ae" as const }, retailerSku: "B0TEST1234", title: "AMD Ryzen 5 5600X Desktop Processor",
    price: 500, url: "https://www.amazon.ae/dp/B0TEST1234", inStock: true, lastSeenAt: new Date(now - 3600000).toISOString() }
  const pick = (override: Partial<typeof offer> = {}) => catalogPart({ id: "test", category: "CPU", listings: [{ ...offer, ...override }] }, "CPU", now)
  assert.equal(pick()?.ageSeconds, 3600)
  for (const override of [{ title: "CPU pin repair kit for Ryzen 5 5600X" }, { url: "https://amazon.com/dp/B0TEST1234" },
    { retailerSku: "OTHER" }, { inStock: false }, { price: 0 }, { lastSeenAt: "2026-10-01T12:00:00Z" }]) {
    assert.equal(pick(override), null)
  }
})
