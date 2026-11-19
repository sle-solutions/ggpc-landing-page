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
import Terms from "../app/terms/page"
import Privacy from "../app/privacy/page"
import { ORDER } from "../lib/order/config"

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
  assert.doesNotMatch(document.body.textContent ?? "", /waitlist benefits|first 100|three guides|consultation|10% off|join the waitlist|notify me|early access|at launch|AED 6,433|AED 90/i)
  assert.match(document.querySelector(".hero")?.textContent ?? "", /UAE only/)
  assert.match(document.querySelector(".hero")?.textContent ?? "", /Install worldwide/)
  assert.match(document.body.textContent ?? "", /More countries coming soon/)
  for (const store of ["Amazon.ae", "noon", "Microless", "Gear-Up", "GCC Gamers"]) assert.ok(document.querySelector("#vendors")?.textContent?.includes(store))
  assert.match(document.querySelector("#get-started")?.textContent ?? "", /available checkout options/)
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
  assert.doesNotMatch(text, /waitlist benefits|member perks|first 100|three guides|consultation|10% off|has not launched|waitlist is open|At launch|Planned features/i)
})


test("conditional code terms and privacy explain redemption without consultation or broad package offers", () => {
  const doc = new JSDOM(renderToStaticMarkup(<Terms />)).window.document
  const text = doc.body.textContent ?? ""
  assert.doesNotMatch(text, /consultation|three guides|First 100 perks/i)
  const heading = [...doc.querySelectorAll("h2")].find(h => h.textContent === "Private member codes")!
  const codes = heading.nextElementSibling!.textContent ?? ""
  assert.match(codes, /If you receive a private member code/)
  assert.match(codes, /original signup email/)
  assert.ok(codes.includes(`${ORDER.ogDiscountRate * 100}% off sourcing and build fees once`))
  assert.match(codes, /Parts, buyer protection and add-ons are excluded/)
  assert.match(codes, /does not open a new member registration/)
  assert.match(codes, /stops checkout instead of silently charging full price/)
  assert.match(codes, /does not reserve or use the benefit or place an order/)
  assert.match(text, /The build service/)
  assert.match(text, /Buyer protection/)
  assert.match(text, /A parts plan or WhatsApp quote request does not commit you to buy anything/)
  const privacy = new JSDOM(renderToStaticMarkup(<Privacy />)).window.document.body.textContent ?? ""
  assert.match(privacy, /HTTPS checkout request and converts it to a one-way digest/)
  assert.match(privacy, /raw code is not written to the order Sheet, Stripe metadata, URLs, browser storage or our application logs/)
  assert.match(privacy, /original member\/order binding/)
  assert.match(privacy, /private member codes and guides/)
})
