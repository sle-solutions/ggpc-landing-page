import assert from "node:assert/strict"
import { before, afterEach, test } from "node:test"
import { JSDOM } from "jsdom"
import { act } from "react"
import type { Root } from "react-dom/client"
import type { OrderPanel as Component } from "../components/order-checkout"
import { ORDER } from "../lib/order/config"

const MEMBER_DISCOUNT_PERCENT = Math.round(ORDER.ogDiscountRate * 100)

let createRoot: typeof import("react-dom/client").createRoot, OrderPanel: typeof Component
const roots: Root[] = [], originalFetch = globalThis.fetch
before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.invalid" })
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true })
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true })
  ;({ createRoot } = await import("react-dom/client")); ({ OrderPanel } = await import("../components/order-checkout"))
})
afterEach(async () => { await act(async () => roots.splice(0).forEach(root => root.unmount())); document.body.replaceChildren(); globalThis.fetch = originalFetch })
async function mount() { const container = document.createElement("div"); document.body.append(container); const root = createRoot(container); roots.push(root); await act(async () => root.render(<OrderPanel code="build-code" buildName="Test build" lane="B" lines={[]} addOns={[]} enabled blockedReason={null} holdCopy="Hold" memberDiscountPercent={MEMBER_DISCOUNT_PERCENT} />)); return container }
async function submit(container: HTMLElement, email = "member@example.invalid") { const form = container.querySelector("form")!; (form.elements.namedItem("email") as HTMLInputElement).value = email; await act(async () => { form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })) }) }

test("pending submissions deduplicate and unknown-outcome retries retain the same intent without a false no-charge claim", async () => {
  const bodies: Record<string, any>[] = []; let release!: (response: Response) => void
  globalThis.fetch = async (_url, init) => { bodies.push(JSON.parse(String(init?.body))); return new Promise<Response>(resolve => { release = resolve }) }
  const panel = await mount(); await submit(panel); await submit(panel); assert.equal(bodies.length, 1); assert.equal((panel.querySelector('input[name="memberCode"]') as HTMLInputElement).value, ""); assert.equal(bodies[0].memberCode, ""); assert.match(bodies[0].intent, /^[a-f0-9-]{36}$/)
  await act(async () => release(Response.json({ error: "sheet_unavailable" }, { status: 502 }))); assert.match(panel.querySelector('[role="alert"]')!.textContent!, /could not confirm checkout/i); assert.doesNotMatch(panel.textContent!, /nothing was charged/i)
  await submit(panel, "MEMBER@example.invalid"); assert.equal(bodies[1].intent, bodies[0].intent); await act(async () => release(Response.json({ error: "checkout_failed" }, { status: 502 })))
  await submit(panel, "different@example.invalid"); assert.notEqual(bodies[2].intent, bodies[0].intent); await act(async () => release(Response.json({ error: "checkout_failed" }, { status: 502 })))
})

test("an unavailable private code stays entered and retries its own intent without a full-price fallback", async () => {
  const requests: Array<{ url: string; body: Record<string, any> }> = []
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), body: JSON.parse(String(init?.body)) })
    return Response.json({ error: "member_code_unavailable" }, { status: 409 })
  }
  const panel = await mount(), field = panel.querySelector<HTMLInputElement>('input[name="memberCode"]')!
  const firstCode = "GGPC-OG-" + Buffer.alloc(32, 1).toString("base64url")
  const secondCode = "GGPC-OG-" + Buffer.alloc(32, 2).toString("base64url")
  const localBefore = { ...window.localStorage }, sessionBefore = { ...window.sessionStorage }
  field.value = firstCode
  await submit(panel)
  assert.equal(requests.length, 1)
  assert.equal(requests[0].body.memberCode, firstCode)
  assert.equal(field.value, firstCode)
  assert.match(panel.querySelector('[role="alert"]')!.textContent!, /Check the code and your original signup email/)
  await submit(panel, "MEMBER@example.invalid")
  assert.equal(requests.length, 2)
  assert.equal(requests[1].body.intent, requests[0].body.intent)
  assert.equal(requests[1].body.memberCode, firstCode)
  field.value = secondCode
  await submit(panel)
  assert.equal(requests.length, 3)
  assert.notEqual(requests[2].body.intent, requests[1].body.intent)
  assert.equal(requests[2].body.memberCode, secondCode)
  field.value = ""
  await submit(panel)
  assert.equal(requests.length, 4)
  assert.notEqual(requests[3].body.intent, requests[2].body.intent)
  assert.equal(requests[3].body.memberCode, "")
  assert.ok(requests.every(request => request.url === "/api/order/checkout"))
  assert.equal(window.location.href, "https://example.invalid/")
  assert.deepEqual({ ...window.localStorage }, localBefore)
  assert.deepEqual({ ...window.sessionStorage }, sessionBefore)
})

test("a malformed private code shows its exact recovery message without clearing it or submitting regular pricing", async () => {
  const bodies: Array<Record<string, any>> = []
  globalThis.fetch = async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body)))
    return Response.json({ error: "bad_member_code" }, { status: 400 })
  }
  const panel = await mount(), field = panel.querySelector<HTMLInputElement>('input[name="memberCode"]')!
  field.value = "incomplete"
  await submit(panel)
  assert.equal(bodies.length, 1)
  assert.equal(bodies[0].memberCode, "incomplete")
  assert.equal(field.value, "incomplete")
  assert.match(panel.querySelector('[role="alert"]')!.textContent!, /Enter the complete private member code, or leave it blank for regular pricing/)
})

test("invalid email never allocates a provider request", async () => { let calls = 0; globalThis.fetch = async () => { calls++; throw new Error("unexpected") }; const panel = await mount(); await submit(panel, "not-an-email"); assert.equal(calls, 0) })

test("switching to quote mode removes hidden selected add-ons from the quoted total", async () => {
  const previous = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "447700900123" // Reserved test destination; never opened.
  try {
    const container = document.createElement("div"); document.body.append(container)
    const root = createRoot(container); roots.push(root)
    const props = { code: "1.test", buildName: "Quote test", lane: "B" as const, lines: [{ label: "Base", fils: 59900 }], addOns: [{ id: "test-addon", name: "Test add-on", priceFils: 10000 }], blockedReason: null, holdCopy: "Hold", memberDiscountPercent: MEMBER_DISCOUNT_PERCENT }
    await act(async () => root.render(<OrderPanel {...props} enabled />))
    await act(async () => (container.querySelector('input[type="checkbox"]') as HTMLInputElement).click())
    const selected = new URL(container.querySelector<HTMLAnchorElement>('a[href^="https://wa.me/"]')!.href).searchParams.get("text")!
    assert.match(selected, /Total: AED 699/)
    assert.match(selected, /Extras: Test add-on/)
    await act(async () => root.render(<OrderPanel {...props} enabled={false} />))
    assert.equal(container.querySelector("form, input, fieldset"), null)
    const text = new URL(container.querySelector<HTMLAnchorElement>('a[href^="https://wa.me/"]')!.href).searchParams.get("text")!
    assert.match(text, /Total: AED 599/)
    assert.doesNotMatch(text, /Total: AED 699/)
    assert.doesNotMatch(text, /Extras:|Test add-on/)
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
    else process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = previous
  }
})

test("quote mode preserves the pending and unknown outcome notice from an earlier checkout", async () => {
  let release!: (response: Response) => void
  globalThis.fetch = async () => new Promise<Response>(resolve => { release = resolve })
  const container = document.createElement("div"); document.body.append(container)
  const root = createRoot(container); roots.push(root)
  const props = { code: "1.test", buildName: "Quote test", lane: "B" as const, lines: [], addOns: [], blockedReason: null, holdCopy: "Hold", memberDiscountPercent: MEMBER_DISCOUNT_PERCENT }
  await act(async () => root.render(<OrderPanel {...props} enabled />))
  await submit(container)
  await act(async () => root.render(<OrderPanel {...props} enabled={false} />))
  assert.equal(container.querySelector("form"), null)
  assert.match(container.querySelector('[role="status"]')?.textContent ?? "", /earlier checkout request is still being checked/)
  await act(async () => release(Response.json({ error: "sheet_unavailable" }, { status: 502 })))
  assert.match(container.querySelector('[role="alert"]')?.textContent ?? "", /could not confirm checkout/i)
  assert.doesNotMatch(container.textContent ?? "", /nothing was charged/i)
})
