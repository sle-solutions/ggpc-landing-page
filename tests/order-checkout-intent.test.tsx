import assert from "node:assert/strict"
import { before, afterEach, test } from "node:test"
import { JSDOM } from "jsdom"
import { act } from "react"
import type { Root } from "react-dom/client"
import type { OrderPanel as Component } from "../components/order-checkout"

let createRoot: typeof import("react-dom/client").createRoot, OrderPanel: typeof Component
const roots: Root[] = [], originalFetch = globalThis.fetch
before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.invalid" })
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true })
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true })
  ;({ createRoot } = await import("react-dom/client")); ({ OrderPanel } = await import("../components/order-checkout"))
})
afterEach(async () => { await act(async () => roots.splice(0).forEach(root => root.unmount())); document.body.replaceChildren(); globalThis.fetch = originalFetch })
async function mount() { const container = document.createElement("div"); document.body.append(container); const root = createRoot(container); roots.push(root); await act(async () => root.render(<OrderPanel code="build-code" buildName="Test build" lane="B" lines={[]} addOns={[]} enabled blockedReason={null} perkCopy="Perk" holdCopy="Hold" />)); return container }
async function submit(container: HTMLElement, email = "member@example.invalid") { const form = container.querySelector("form")!; (form.elements.namedItem("email") as HTMLInputElement).value = email; await act(async () => { form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })) }) }

test("pending submissions deduplicate and unknown-outcome retries retain the same intent without a false no-charge claim", async () => {
  const bodies: Record<string, any>[] = []; let release!: (response: Response) => void
  globalThis.fetch = async (_url, init) => { bodies.push(JSON.parse(String(init?.body))); return new Promise<Response>(resolve => { release = resolve }) }
  const panel = await mount(); await submit(panel); await submit(panel); assert.equal(bodies.length, 1); assert.match(bodies[0].intent, /^[a-f0-9-]{36}$/)
  await act(async () => release(Response.json({ error: "sheet_unavailable" }, { status: 502 }))); assert.match(panel.querySelector('[role="alert"]')!.textContent!, /could not confirm checkout/i); assert.doesNotMatch(panel.textContent!, /nothing was charged/i)
  await submit(panel, "MEMBER@example.invalid"); assert.equal(bodies[1].intent, bodies[0].intent); await act(async () => release(Response.json({ error: "checkout_failed" }, { status: 502 })))
  await submit(panel, "different@example.invalid"); assert.notEqual(bodies[2].intent, bodies[0].intent); await act(async () => release(Response.json({ error: "checkout_failed" }, { status: 502 })))
})
test("invalid email never allocates a provider request", async () => { let calls = 0; globalThis.fetch = async () => { calls++; throw new Error("unexpected") }; const panel = await mount(); await submit(panel, "not-an-email"); assert.equal(calls, 0) })
