import assert from "node:assert/strict"
import { test } from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { JSDOM } from "jsdom"
import BuildPage from "../app/build/[code]/page"
import { GOLDEN_CODE } from "./order-fixtures"

function page(code: string) {
  return BuildPage({ params: Promise.resolve({ code }), searchParams: Promise.resolve({}) })
}

test("invalid already-decoded build links render recovery instead of throwing or fetching prices", async () => {
  const oldFetch = globalThis.fetch
  let requests = 0
  globalThis.fetch = async () => { requests++; throw new Error("unexpected_quote_request") }
  try {
    for (const code of ["%", "1.%", "%E0%A4%A", "%31." + GOLDEN_CODE.slice(2), "not-a-code"]) {
      const doc = new JSDOM(renderToStaticMarkup(await page(code))).window.document
      assert.equal(doc.querySelector('[role="alert"] h1')?.textContent, "This build link does not work", code)
      assert.match(doc.querySelector('[role="alert"]')?.textContent ?? "", /Order this build again/)
    }
    assert.equal(requests, 0)
  } finally { globalThis.fetch = oldFetch }
})

test("a genuine extension build link still requests its exact retailer SKUs and recovers from API failure", async () => {
  const oldFetch = globalThis.fetch
  let requests = 0
  globalThis.fetch = async (_input, init) => {
    requests++
    const request = JSON.parse(String(init?.body))
    assert.equal(request.parts[0].slot, "CPU")
    assert.deepEqual(request.parts[0].candidates, [{ retailer: "amazon_ae", retailerSku: "B0BBHD5D8Y" }, { retailer: "noon", retailerSku: "N53346840A" }])
    return new Response("", { status: 503 })
  }
  try {
    const doc = new JSDOM(renderToStaticMarkup(await page(GOLDEN_CODE))).window.document
    assert.equal(requests, 1)
    assert.equal(doc.querySelector("h1")?.textContent, "My build")
    assert.equal(doc.querySelector('[role="alert"]'), null)
    assert.match(doc.body.textContent ?? "", /We cannot check prices right now/)
  } finally { globalThis.fetch = oldFetch }
})
