import assert from "node:assert/strict"
import { before, afterEach, test } from "node:test"
import { JSDOM } from "jsdom"
import { act } from "react"
import type { Root } from "react-dom/client"
import type { WaitlistForm as FormComponent } from "../components/waitlist-form"

let createRoot: typeof import("react-dom/client").createRoot
let WaitlistForm: typeof FormComponent
let roots: Root[] = []
const originalFetch = globalThis.fetch

before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" })
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, FormData: dom.window.FormData, DOMException: dom.window.DOMException })
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true })
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  ;({ createRoot } = await import("react-dom/client"))
  ;({ WaitlistForm } = await import("../components/waitlist-form"))
})

afterEach(async () => {
  await act(async () => { roots.forEach(root => root.unmount()) })
  roots = []
  document.body.replaceChildren()
  globalThis.fetch = originalFetch
})

async function mount(two = false) {
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => root.render(<><WaitlistForm id="test-signup" />{two && <WaitlistForm id="test-closing" dark />}</>))
  return container
}
async function submit(container: HTMLElement, email = "builder@example.com") {
  const form = container.querySelector("form")!
  ;(form.elements.namedItem("email") as HTMLInputElement).value = email
  await act(async () => { form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })) })
}
const reply = (success: boolean, ok = true) => ({ ok, json: async () => ({ success }) }) as Response

test("invalid and empty email never call the waitlist service", async () => {
  let calls = 0
  globalThis.fetch = async () => { calls++; return reply(true) }
  const container = await mount()
  await submit(container, "")
  await submit(container, "not-an-email")
  assert.equal(calls, 0)
  assert.equal(container.querySelector("button")?.textContent, "Join the waitlist")
})

test("submits the existing integration, prevents duplicate requests, and keeps success visible", async () => {
  let calls = 0
  let body: FormData | undefined
  let release!: (value: Response) => void
  globalThis.fetch = async (url, options) => {
    calls++
    assert.equal(url, "https://api.web3forms.com/submit")
    assert.equal(options?.method, "POST")
    body = options?.body as FormData
    return new Promise<Response>(resolve => { release = resolve })
  }
  const container = await mount()
  await submit(container)
  assert.equal(container.querySelector("form")?.getAttribute("aria-busy"), "true")
  assert.equal(container.querySelector("button")?.disabled, true)
  assert.equal(container.querySelector("input")?.disabled, true)
  await submit(container)
  assert.equal(calls, 1)
  assert.equal(body?.get("email"), "builder@example.com")
  assert.equal(body?.get("subject"), "New GGPC Waitlist Signup")
  assert.ok(body?.get("access_key"))
  assert.equal(body?.get("build_goal"), null)
  await act(async () => release(reply(true)))
  assert.match(container.querySelector('[role="status"]')!.textContent!, /on the list/)
  assert.equal(container.querySelector("form"), null)
})

test("service rejection is visible, preserves the email, and allows retry", async () => {
  let calls = 0
  globalThis.fetch = async () => reply(++calls > 1)
  const container = await mount()
  await submit(container)
  assert.match(container.querySelector('[role="alert"]')!.textContent!, /Please try again/)
  assert.equal(container.querySelector("input")?.value, "builder@example.com")
  assert.equal(container.querySelector("button")?.disabled, false)
  await submit(container)
  assert.equal(calls, 2)
  assert.ok(container.querySelector('[role="status"]'))
})

test("a failed HTTP response cannot produce a false success", async () => {
  globalThis.fetch = async () => reply(true, false)
  const container = await mount()
  await submit(container)
  assert.ok(container.querySelector('[role="alert"]'))
  assert.equal(container.querySelector('[role="status"]'), null)
})

test("network and timeout errors have recovery copy", async () => {
  globalThis.fetch = async () => { throw new TypeError("network") }
  const container = await mount()
  await submit(container)
  assert.match(container.querySelector('[role="alert"]')!.textContent!, /could not save your email/)
  globalThis.fetch = async () => { throw new DOMException("timeout", "AbortError") }
  await submit(container)
  assert.match(container.querySelector('[role="alert"]')!.textContent!, /took too long/)
})

test("hero and closing forms have distinct labels and independent states", async () => {
  globalThis.fetch = async () => reply(true)
  const container = await mount(true)
  assert.equal(container.querySelectorAll("#test-signup-email").length, 1)
  assert.equal(container.querySelectorAll("#test-closing-email").length, 1)
  await submit(container)
  assert.ok(container.querySelector("#test-signup [role=status]"))
  assert.ok(container.querySelector("#test-closing form"))
  assert.equal(container.querySelector<HTMLInputElement>("#test-closing input")?.disabled, false)
})

test("an optional build quest carries the completed brief into signup and can be reset", async () => {
  const { BuildBriefProvider } = await import("../components/build-brief")
  const { BuildPaths } = await import("../components/build-paths")
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => root.render(<BuildBriefProvider><BuildPaths /><WaitlistForm id="quest-signup" /></BuildBriefProvider>))
  assert.match(container.querySelector(".quest-feedback")!.textContent!, /Your first move/)
  assert.equal(container.querySelector(".signup-brief"), null)
  const choose = async (group: number, option: number) => {
    const radio = container.querySelectorAll("fieldset")[group].querySelectorAll<HTMLInputElement>("input")[option]
    await act(async () => radio.click())
  }
  await choose(0, 1)
  await choose(1, 3)
  assert.match(container.querySelector(".quest-feedback")!.textContent!, /1 pick left/)
  assert.equal(container.querySelector(".signup-brief"), null)
  await choose(2, 1)
  assert.match(container.querySelector(".quest-feedback")!.textContent!, /Build brief unlocked/)
  assert.match(container.querySelector(".signup-brief")!.textContent!, /Big worlds/)
  let body: FormData | undefined
  globalThis.fetch = async (_, options) => { body = options?.body as FormData; return reply(true) }
  await submit(container)
  assert.equal(body?.get("build_goal"), "Big worlds, great visuals")
  assert.equal(body?.get("budget_range"), "Still figuring it out")
  assert.equal(body?.get("assembly_preference"), "I want it built for me")
  assert.match(container.querySelector(".signup-success")!.textContent!, /brief is saved/)
  await act(async () => container.querySelector<HTMLButtonElement>(".quest-reset")!.click())
  assert.equal(container.querySelectorAll("input:checked").length, 0)
  assert.match(container.querySelector(".quest-feedback")!.textContent!, /Your first move/)
  assert.match(container.querySelector(".signup-success")!.textContent!, /brief is saved/)
})

test("quest navigation shows one question, preserves earlier choices, and moves keyboard focus", async () => {
  const { BuildBriefProvider } = await import("../components/build-brief")
  const { BuildPaths } = await import("../components/build-paths")
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => root.render(<BuildBriefProvider><BuildPaths /></BuildBriefProvider>))
  const visible = () => container.querySelectorAll("fieldset:not([hidden])")
  const button = (text: string) => Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find(b => b.textContent?.trim() === text)!
  assert.equal(visible().length, 1)
  assert.equal(button("Next: budget").disabled, true)
  assert.equal(document.activeElement?.tagName, "BODY")
  await act(async () => container.querySelector<HTMLInputElement>('fieldset:not([hidden]) input')!.click())
  await act(async () => button("Next: budget").click())
  assert.equal(visible().length, 1)
  assert.match(visible()[0].textContent!, /parts budget/)
  assert.equal(document.activeElement, visible()[0].querySelector("legend"))
  await act(async () => button("Back").click())
  assert.match(visible()[0].textContent!, /What is your PC for/)
  assert.equal(visible()[0].querySelector<HTMLInputElement>("input")!.checked, true)
  await act(async () => button("Start again").click())
  assert.equal(container.querySelectorAll("input:checked").length, 0)
  assert.equal(visible().length, 1)
  assert.equal(button("Next: budget").disabled, true)
  assert.equal(container.querySelector('.quest-skip')?.getAttribute('href'), '#closing-signup')
})
