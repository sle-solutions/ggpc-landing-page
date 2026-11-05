import assert from "node:assert/strict"
import { test } from "node:test"
import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { JSDOM } from "jsdom"
import Home from "../app/page"
import { Navbar } from "../components/navbar"
import { CHROME_STORE_URL } from "../lib/extension"
import { faqs } from "../components/faq"
import { GuideNext } from "../components/guide-shell"

test("home launches the exact Chrome item from hero, header and closing actions without signup UX", () => {
  const document = new JSDOM(renderToStaticMarkup(<Home />)).window.document
  assert.equal(CHROME_STORE_URL, "https://chromewebstore.google.com/detail/hnkngjlliafocefngenbofeddalifcjk")
  for (const region of ["header", ".hero", "#get-started"]) {
    const link = document.querySelector(`${region} a[href='${CHROME_STORE_URL}']`)
    assert.ok(link, `${region} has exact install destination`)
    assert.match(link.textContent ?? "", /Add to Chrome/)
    assert.equal(link.querySelector("img")?.getAttribute("src"), "/browser/chrome.svg")
    assert.match(link.getAttribute("rel") ?? "", /noopener/)
  }
  assert.equal(document.querySelectorAll("form, input[type=email], a[href*='signup']").length, 0)
  assert.doesNotMatch(document.body.textContent ?? "", /join the waitlist|notify me|early access|at launch|AED 6,433|AED 90/i)
  assert.match(document.querySelector(".hero")?.textContent ?? "", /UAE only/)
  assert.match(document.querySelector(".hero")?.textContent ?? "", /Install worldwide/)
  assert.match(document.body.textContent ?? "", /More countries coming soon/)
  for (const store of ["Amazon.ae", "noon", "Microless", "Gear-Up", "GCC Gamers"]) assert.ok(document.querySelector("#vendors")?.textContent?.includes(store))
  assert.match(document.querySelector("#get-started")?.textContent ?? "", /Online card checkout is not available yet/)
  assert.equal(document.querySelector(".quest-skip")?.getAttribute("href"), "/builder")
  for (const href of ["/privacy", "/terms", "/warranty", "/builder"]) assert.ok(document.querySelector(`a[href='${href}']`))
  const graph = JSON.parse(document.querySelector("script[type='application/ld+json']")!.textContent!)["@graph"]
  assert.deepEqual(graph.find((entry: Record<string, unknown>) => entry["@type"] === "FAQPage").mainEntity.map((entry: { acceptedAnswer: { text: string } }) => entry.acceptedAnswer.text), faqs.map(faq => faq.answer))
  assert.equal(graph.find((entry: Record<string, unknown>) => entry["@type"] === "Organization").areaServed.identifier, "AE")
})

test("secondary navigation and guide actions reach an available next step", () => {
  const document = new JSDOM(renderToStaticMarkup(<><Navbar /><GuideNext title="Next step"><p>Plan your PC.</p></GuideNext></>)).window.document
  assert.ok(document.querySelector(`header a[href='${CHROME_STORE_URL}']`))
  assert.ok(document.querySelector(".guide-next a[href='/builder']"))
  assert.equal(document.querySelectorAll("a[href*='signup']").length, 0)
})


test("all public FAQ facts remain synchronized with the search summary", () => {
  const text = readFileSync(new URL("../public/llms.txt", import.meta.url), "utf8")
  for (const faq of faqs) assert.ok(text.includes(`- Q: ${faq.question} A: ${faq.answer}`), faq.question)
  assert.doesNotMatch(text, /has not launched|waitlist is open|At launch|Planned features/i)
})
