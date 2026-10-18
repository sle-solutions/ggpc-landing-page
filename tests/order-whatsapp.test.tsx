import assert from "node:assert/strict"
import { test } from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import BuilderPage from "../app/builder/page"
import { OrderPanel } from "../components/order-checkout"
import { buildWhatsAppQuoteUrl, normalizeWhatsAppNumber } from "../lib/order/whatsapp"

const RESERVED_TEST_NUMBER = "447700900123" // UK drama-use range, never a real business destination.

test("WhatsApp number must be international digits only and within E.164 length", () => {
  assert.equal(normalizeWhatsAppNumber(undefined), null)
  assert.equal(normalizeWhatsAppNumber(""), null)
  assert.equal(normalizeWhatsAppNumber(RESERVED_TEST_NUMBER), RESERVED_TEST_NUMBER)
  assert.equal(normalizeWhatsAppNumber("+447700900123"), null)
  assert.equal(normalizeWhatsAppNumber("44 7700 900123"), null)
  assert.equal(normalizeWhatsAppNumber("01234567"), null)
  assert.equal(normalizeWhatsAppNumber("1".repeat(16)), null)
})

test("quote link encodes the build, displayed total and request", () => {
  const url = buildWhatsAppQuoteUrl({ number: RESERVED_TEST_NUMBER, buildName: "GG PC Mid loadout", code: "1.eyJidWlsZCJ9", totalFils: 520000 })
  assert.ok(url)
  const parsed = new URL(url)
  assert.equal(parsed.origin + parsed.pathname, `https://wa.me/${RESERVED_TEST_NUMBER}`)
  const message = parsed.searchParams.get("text") ?? ""
  assert.match(message, /GG PC Mid loadout/)
  assert.match(message, /Total: AED 5,200/)
  assert.match(message, /https:\/\/www\.ggpc\.app\/build\/1\.eyJidWlsZCJ9/)
  assert.match(message, /What is your budget and which games do you play\?/)
  assert.ok(message.length < 600)
})

test("build link and total are included when shown and total is omitted when unavailable", () => {
  const included = buildWhatsAppQuoteUrl({ number: RESERVED_TEST_NUMBER, buildName: "A build", code: "1.abc", totalFils: 123456 })
  const omitted = buildWhatsAppQuoteUrl({ number: RESERVED_TEST_NUMBER, buildName: "A build", code: "1.abc", totalFils: null })
  assert.match(decodeURIComponent(included ?? ""), /Total: AED 1,234\.56/)
  assert.doesNotMatch(decodeURIComponent(omitted ?? ""), /Total AED/)
})

test("a typical full build code keeps the prefilled message below 600 characters", () => {
  const code = "1." + "W".repeat(456)
  const url = buildWhatsAppQuoteUrl({ number: RESERVED_TEST_NUMBER, buildName: "GG PC Mid loadout", code, totalFils: 494361 })
  assert.ok(url)
  const message = new URL(url).searchParams.get("text") ?? ""
  assert.ok(message.length < 600)
})

test("order panel hides the WhatsApp action when the number is unset", () => {
  const previous = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  try {
    const html = renderToStaticMarkup(createElement(OrderPanel, {
      code: "1.abc", buildName: "A build", lane: "A", lines: [], addOns: [], enabled: false,
      blockedReason: "We cannot show a total until prices load.", perkCopy: "OG perk.", holdCopy: "Price hold.",
    }))
    assert.doesNotMatch(html, /Get a quote on WhatsApp/)
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
    else process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = previous
  }
})

test("builder hides both WhatsApp actions when the number is unset", async () => {
  const previousNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  const previousFetch = globalThis.fetch
  delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  const loadout = { budget: 4000, partsTotal: 1000, gpu: "Test GPU", cpu: "Test CPU", fit: "ok", notes: [], parts: [] }
  globalThis.fetch = async () => new Response(JSON.stringify({ generatedAt: "2026-10-18T00:00:00.000Z", loadouts: Array(4).fill(loadout) }), { status: 200, headers: { "Content-Type": "application/json" } })
  try {
    const page = await BuilderPage({ searchParams: Promise.resolve({ tier: "mid" }) })
    const html = renderToStaticMarkup(page)
    assert.doesNotMatch(html, /WhatsApp/)
    assert.match(html, /Have it built/)
  } finally {
    globalThis.fetch = previousFetch
    if (previousNumber === undefined) delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
    else process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = previousNumber
  }
})
