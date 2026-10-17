import type { Metadata } from "next"
import Link from "next/link"
import { Glyph } from "@/components/pixel"
import { BackToGuides, GuideNext, GuideSection, GuideShell, type TocItem } from "@/components/guide-shell"

const site = "https://www.ggpc.app"
const url = `${site}/guides/prebuilt-vs-custom-pc-dubai`
const headline = "Prebuilt vs custom gaming PC in Dubai: which should you choose? (2026)"

export const metadata: Metadata = {
  title: `${headline} | GG PC`,
  description: "A plain English comparison of buying a prebuilt gaming PC, paying a local builder to assemble one, or building it yourself in Dubai and the UAE, with how to compare quotes fairly.",
  alternates: { canonical: "/guides/prebuilt-vs-custom-pc-dubai" },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${url}#article`,
      headline,
      description: "A plain English guide to choosing between a prebuilt gaming PC, a builder assembled PC and a DIY build in Dubai and the UAE.",
      datePublished: "2026-10-17",
      dateModified: "2026-10-17",
      inLanguage: "en-AE",
      author: { "@type": "Person", name: "Ali Lari" },
      publisher: { "@id": `${site}/#organization` },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site },
        { "@type": "ListItem", position: 2, name: "Guides", item: `${site}/guides` },
        { "@type": "ListItem", position: 3, name: headline, item: url },
      ],
    },
  ],
}

const toc: TocItem[] = [
  { id: "routes", label: "The three routes", marker: "1" },
  { id: "compare", label: "How to compare fairly", marker: "2" },
  { id: "spec-sheet", label: "What to check on a prebuilt", marker: "3" },
  { id: "who", label: "Who should pick which", marker: "4" },
  { id: "checklist", label: "Before you decide", marker: "check" },
]

const routes = [
  {
    name: "Buy a prebuilt",
    pros: "One seller and one warranty point, and it is ready to use when it arrives.",
    cons: "Some prebuilts save money on the power supply, RAM or motherboard, so read the full spec sheet instead of just the CPU and graphics card.",
  },
  {
    name: "Pay a local builder to assemble",
    pros: "You (or the builder) choose the parts, and someone experienced puts them together.",
    cons: "Assembly fees vary by shop. Ask what is included, such as cable management, Windows install, testing and a warranty on the labour.",
  },
  {
    name: "Build it yourself",
    pros: "Usually the cheapest route for the same parts, because there is no assembly fee and no prebuilt markup.",
    cons: "You handle each part's warranty separately and do your own troubleshooting if something does not boot.",
  },
]

const compareItems = [
  { name: "Same parts list", text: "write down the exact model of every part and compare like with like. A cheaper quote with a weaker power supply is not cheaper." },
  { name: "Operating system", text: "check whether a Windows licence is included. If it is not, add it to the total." },
  { name: "VAT", text: "prices in the UAE include 5% VAT, so make sure every quote is a final price." },
  { name: "Delivery", text: "ask whether delivery or collection costs extra." },
  { name: "Warranty", text: "ask how long it lasts, whether it covers the whole PC or only each part, and who handles claims." },
  { name: "Written quote", text: "ask for the parts list, fees and warranty terms in writing before you pay." },
]

const specChecks = [
  { name: "Graphics card", text: "the exact model, not just the chip family. Two cards with similar names can perform very differently." },
  { name: "Power supply", text: "the brand and wattage. A listing that says only \"750W PSU\" tells you very little about its quality." },
  { name: "RAM", text: "the speed and whether it is a matched pair, so it runs in dual channel." },
  { name: "Storage", text: "the type (NVMe SSD, SATA SSD or hard drive) and the size." },
  { name: "Motherboard", text: "the exact model, which shows what upgrades and ports you will get later." },
]

const checklist = [
  "I have the full parts list with exact model names for every route I am comparing.",
  "Each quote includes 5% VAT, and I know whether delivery costs extra.",
  "I know whether a Windows licence is included.",
  "I know the warranty length and who handles a claim.",
  "For a builder, I know what the assembly fee covers and have it in writing.",
  "For a prebuilt, I have checked the power supply, RAM, storage and motherboard, not just the CPU and graphics card.",
  "For a DIY build, I have checked compatibility and I am comfortable with troubleshooting.",
]

export default function PrebuiltVsCustomPcDubai() {
  return (
    <GuideShell
      crumbs={[{ label: "Home", href: "/" }, { label: "Guides", href: "/guides" }, { label: headline }]}
      title={headline}
      meta={<>By Ali Lari, founder of GG PC <span aria-hidden="true">/</span> Updated <time dateTime="2026-10-17">17 October 2026</time></>}
      lede={
        <div className="guide-answer frame">
          <h2>Short answer</h2>
          <p>There are three routes: buy a prebuilt PC, pay a local builder to assemble parts you or they choose, or build it yourself. Yes, you can build a custom PC in the UAE, because the parts are sold by local retailers. Building it yourself usually costs less for the same parts, because you skip assembly fees and prebuilt markups. A prebuilt can still be competitive when it bundles parts at a discount or includes a Windows licence, so compare the exact parts list before you decide.</p>
        </div>
      }
      toc={toc}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <GuideSection id="routes" marker="1" title="The three routes">
        <p>Each route trades money against time and risk. None is the right answer for everyone.</p>
        <ul className="guide-bullets">
          {routes.map(route => (
            <li key={route.name}><strong>{route.name}:</strong> {route.pros} The catch: {route.cons.charAt(0).toLowerCase() + route.cons.slice(1)}</li>
          ))}
        </ul>
        <p>Fees and prices vary between shops and change over time, so this guide does not quote any. Ask for a written quote instead.</p>
      </GuideSection>

      <GuideSection id="compare" marker="2" title="How to compare fairly">
        <p>The cheapest sticker price is not always the cheapest PC. Put every option on the same footing before you compare totals.</p>
        <ul className="guide-checks">
          {compareItems.map(item => (
            <li key={item.name}><Glyph name="check" size={16} /><span><strong>{item.name}:</strong> {item.text}</span></li>
          ))}
        </ul>
        <p>To see what a DIY version of a prebuilt would cost, list its parts and price each one at UAE stores. The <Link href="/guides/build-a-gaming-pc-uae">UAE build guide</Link> covers comparing store prices.</p>
      </GuideSection>

      <GuideSection id="spec-sheet" marker="3" title="What to check on a prebuilt spec sheet">
        <p>A prebuilt listing often leads with the CPU and graphics card. The parts below are the ones worth checking before you pay. If the listing does not name them, ask.</p>
        <ul className="guide-checks">
          {specChecks.map(check => (
            <li key={check.name}><Glyph name="check" size={16} /><span><strong>{check.name}:</strong> {check.text}</span></li>
          ))}
        </ul>
        <p>For help judging the graphics card, read <Link href="/guides/buy-a-gpu-uae">how to buy a graphics card in the UAE</Link>. To see why the other parts matter together, read <Link href="/guides/pc-part-compatibility">PC part compatibility explained</Link>.</p>
      </GuideSection>

      <GuideSection id="who" marker="4" title="Who should pick which">
        <ul className="guide-bullets">
          <li><strong>Prebuilt:</strong> you want a PC that works on day one with one place to go for support, and the spec sheet checks out.</li>
          <li><strong>Builder service:</strong> you want to pick the parts but not assemble them, and the assembly fee and warranty terms are clear in writing.</li>
          <li><strong>DIY:</strong> you want the lowest price for the parts, you are happy to learn, and you can handle troubleshooting. First timers can start with the <Link href="/guides/first-pc-build-checklist">first PC build checklist</Link>.</li>
        </ul>
        <aside className="guide-note frame" aria-label="About GG PC">
          <span className="guide-tag">Planned</span>
          <p>GG PC is being built to compare UAE store prices in AED and check that parts fit, and it is planning an optional build service. It has not launched yet, and the waitlist is open.</p>
        </aside>
      </GuideSection>

      <GuideSection id="checklist" marker="check" title="Before you decide">
        <p>Run through this list once you have two or three options in mind.</p>
        <ul className="guide-checklist">
          {checklist.map(item => (
            <li key={item}><span className="check-slot" aria-hidden="true" /><span>{item}</span></li>
          ))}
        </ul>
      </GuideSection>

      <GuideNext title="Next step">
        <p>GG PC is the tool being built to make part choices easier for UAE gamers. Join the <Link href="/#signup">GG PC waitlist</Link> for early access.</p>
      </GuideNext>

      <BackToGuides />
    </GuideShell>
  )
}
