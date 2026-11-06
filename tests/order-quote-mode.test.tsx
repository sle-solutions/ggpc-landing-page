import assert from "node:assert/strict"
import { test } from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { JSDOM } from "jsdom"
import { OrderPanel } from "../components/order-checkout"
import { LaneSwitch } from "../components/order-view"
import { PartsList, ShoppingList } from "../components/order-parts"
import { ORDER } from "../lib/order/config"
import BuilderPage from "../app/builder/page"

const NUMBER = "447700900123" // Reserved drama-use number. No requests or messages.
const base = {
  code: "1.test", buildName: "Quote test", lane: "B" as const,
  lines: [{ label: "Build fee", fils: ORDER.buildFeeFils }, { label: "Buyer protection", fils: ORDER.protectionFeeFils }],
  addOns: [{ id: "test-addon", name: "Test add-on", priceFils: 10000 }],
  blockedReason: null, perkCopy: ORDER.perkCopy, holdCopy: "We place a hold on your card.",
}

function panel(enabled: boolean, blockedReason: string | null = null) {
  return new JSDOM(renderToStaticMarkup(createElement(OrderPanel, { ...base, enabled, blockedReason }))).window.document
}
function withNumber(value: string | undefined, run: () => void) {
  const old = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  if (value === undefined) delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  else process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = value
  try { run() } finally {
    if (old === undefined) delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
    else process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = old
  }
}

test("quote mode gives a working quote destination without inactive payment or add-on controls", () => withNumber(NUMBER, () => {
  const doc = panel(false)
  assert.equal(doc.querySelector("h2")?.textContent, "Build estimate")
  assert.equal(doc.querySelectorAll("form, input, button, fieldset").length, 0)
  assert.doesNotMatch(doc.body.textContent ?? "", /opens soon|hold on your card|You pay on Stripe|Applied at checkout|Test add-on/i)
  assert.match(doc.body.textContent ?? "", /confirm the parts, availability and service quote/i)
  assert.match(doc.body.textContent ?? "", /check your existing member benefit/i)
  const link = doc.querySelector<HTMLAnchorElement>('a[href^="https://wa.me/"]')!
  assert.ok(link)
  assert.equal(link.target, "_blank")
  assert.equal(link.rel, "noopener noreferrer")
  const url = new URL(link.href)
  assert.equal(url.pathname, `/${NUMBER}`)
  assert.match(url.searchParams.get("text") ?? "", /Total: AED 599/)
  assert.match(url.searchParams.get("text") ?? "", /\/build\/1\.test/)
  assert.match(url.searchParams.get("text") ?? "", /\/build\/1\.test\?lane=b/)
  assert.match(url.searchParams.get("text") ?? "", /I buy, you build\./)
}))

test("unpriced parts can still request help without including an unavailable total", () => withNumber(NUMBER, () => {
  const doc = panel(false, "We cannot show a total until prices load.")
  const url = new URL(doc.querySelector<HTMLAnchorElement>('a[href^="https://wa.me/"]')!.href)
  assert.doesNotMatch(url.searchParams.get("text") ?? "", /Total:/)
  assert.match(doc.body.textContent ?? "", /cannot show a total/i)
  assert.equal(doc.querySelector("form"), null)
}))

test("a missing quote destination has an actionable fallback without an inert checkout form", () => withNumber(undefined, () => {
  const doc = panel(false)
  assert.match(doc.querySelector('[role="status"]')?.textContent ?? "", /Quotes are unavailable right now/)
  assert.equal(doc.querySelector('a[href="/builder"]')?.textContent, "adjust your parts plan in the builder")
  assert.equal(doc.querySelector('a[href^="https://wa.me/"]'), null)
  assert.equal(doc.querySelector("form"), null)
}))

test("configured card checkout retains its real email, add-on and payment flow", () => withNumber(NUMBER, () => {
  const doc = panel(true)
  assert.equal(doc.querySelector("h2")?.textContent, "Order total")
  assert.ok(doc.querySelector('form input[name="email"]'))
  assert.ok(doc.querySelector('input[type="checkbox"]'))
  assert.equal(doc.querySelector('button[type="submit"]')?.textContent, "Go to checkout")
  assert.match(doc.body.textContent ?? "", /hold on your card/)
  assert.match(doc.body.textContent ?? "", /You pay on Stripe/)
}))

test("quote-only service choices do not promise a payment action", () => {
  const quote = renderToStaticMarkup(createElement(LaneSwitch, { code: "1.test", lane: "A", enabled: false }))
  const paid = renderToStaticMarkup(createElement(LaneSwitch, { code: "1.test", lane: "A", enabled: true }))
  assert.doesNotMatch(quote, /One payment/)
  assert.match(quote, /confirm availability and your service quote/)
  assert.match(paid, /One payment/)
})

test("quote-only shopping instructions do not promise checkout or a paid delivery address", () => {
  const props = { build: { name: "Quote plan", parts: [] }, quote: { currency: "AED" as const, maxAgeSeconds: 604800 as const, generatedAt: "2026-11-06T07:00:00.000Z", parts: [] } }
  const quote = renderToStaticMarkup(createElement(ShoppingList, { ...props, checkoutEnabled: false }))
  const checkout = renderToStaticMarkup(createElement(ShoppingList, props))
  assert.doesNotMatch(quote, /After checkout|right after you pay|order ID/)
  assert.match(quote, /confirm your parts plan and delivery arrangements/)
  assert.match(checkout, /After checkout you get an order ID/)
  assert.match(checkout, /right after you pay the build fee/)
})

test("a skipped cooler does not guarantee the CPU package includes one", () => {
  const html = renderToStaticMarkup(createElement(PartsList, { build: { name: "Plan", parts: [{ slot: "CPU_COOLER", candidates: [] }] }, quote: null, lane: "A" }))
  assert.match(html, /Confirm the CPU includes a suitable cooler/)
  assert.doesNotMatch(html, /CPU brings its own cooler/)
})

test("unavailable builder data has a recovery state without a launch or refresh-time promise", async () => {
  const old = globalThis.fetch
  globalThis.fetch = async () => new Response("", { status: 404 })
  try {
    const doc = new JSDOM(renderToStaticMarkup(await BuilderPage({ searchParams: Promise.resolve({ tier: "mid" }) }))).window.document
    assert.match(doc.querySelector('#loadout-result [role="status"]')?.textContent ?? "", /cannot load price observations/i)
    assert.doesNotMatch(doc.body.textContent ?? "", /check back soon|not switched on yet|today.s UAE|refreshed every few minutes|before your card is charged/i)
  } finally { globalThis.fetch = old }
})
