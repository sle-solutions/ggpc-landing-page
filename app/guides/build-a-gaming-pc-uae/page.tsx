import type { Metadata } from "next"
import Link from "next/link"
import { Glyph } from "@/components/pixel"
import { BackToGuides, GuideNext, GuideSection, GuideShell, type TocItem } from "@/components/guide-shell"

const site = "https://www.ggpc.app"
const url = `${site}/guides/build-a-gaming-pc-uae`
const headline = "How to build a gaming PC in the UAE (2026)"

export const metadata: Metadata = {
  title: `${headline} | GG PC`,
  description: "A plain English guide to building a gaming PC in the UAE: set an AED budget, choose parts in order, check compatibility and compare store prices.",
  alternates: { canonical: "/guides/build-a-gaming-pc-uae" },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${url}#article`,
      headline,
      description: "A plain English guide to building a gaming PC in the UAE, from budget to assembly.",
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
  { id: "budget", label: "Set your budget in AED", marker: "1" },
  { id: "parts", label: "Choose parts in this order", marker: "2" },
  { id: "compatibility", label: "Check compatibility", marker: "3" },
  { id: "prices", label: "Compare prices across UAE stores", marker: "4" },
  { id: "build", label: "Build it, or have it built", marker: "5" },
  { id: "checklist", label: "First build checklist", marker: "check" },
]

const tiers = [
  { budget: "Under AED 3,000", aim: "usually aimed at 1080p esports and lighter games at modest settings. Expect to compromise on the graphics card, storage size or both." },
  { budget: "AED 3,000 to 5,000", aim: "usually aimed at smooth 1080p in most games, with some titles reaching 1440p." },
  { budget: "Over AED 5,000", aim: "usually aimed at high refresh rate 1440p, and 4K if the budget stretches well past it." },
]

const parts = [
  { name: "CPU", text: "the processor sets your socket, and so your motherboard options. For games, a mid range CPU paired with a stronger graphics card usually beats the reverse." },
  { name: "Motherboard", text: "the board must match the CPU socket and decides your RAM type, storage slots and size (ATX, micro ATX or mini ITX)." },
  { name: "RAM", text: "16 GB is a common starting point for gaming, and 32 GB gives more room. Buy two matching sticks so they run in dual channel." },
  { name: "GPU", text: "the graphics card drives frame rates more than any other part. Check its length and power connectors before you commit." },
  { name: "Storage", text: "an NVMe SSD loads games far faster than a hard drive. Pick a size that fits your library, since modern games are large." },
  { name: "PSU", text: "the power supply feeds everything else. Choose a reputable unit with enough wattage and the right connectors." },
  { name: "Case", text: "the case must fit the motherboard size, the GPU length and the cooler height, and it should have decent airflow." },
  { name: "Cooler", text: "a CPU cooler keeps the processor at a safe temperature. Some CPUs ship with one and some do not, so check the box contents. UAE summers make good airflow worth planning for." },
]

const checks = [
  { name: "Socket", text: "the CPU socket must match the motherboard. An AMD AM5 CPU needs an AM5 board, and Intel 12th to 14th gen Core CPUs use LGA1700 boards." },
  { name: "RAM type", text: "the RAM must match the board. AM5 boards use DDR5, so DDR4 sticks will not fit." },
  { name: "GPU length", text: "the card must fit inside the case. Compare the card length with the maximum GPU length in the case specs." },
  { name: "PSU wattage and connectors", text: "the power supply should cover the whole system with headroom, and it needs the right power connectors for your graphics card." },
  { name: "Cooler height", text: "a tower cooler must be shorter than the case allows, or the side panel will not close." },
]

const checklist = [
  "The total budget is set in AED and includes a small buffer.",
  "The CPU socket matches the motherboard.",
  "The RAM type matches the motherboard.",
  "The GPU length and cooler height fit the case.",
  "The PSU wattage and connectors suit the graphics card.",
  "Prices are compared across at least two UAE stores, with VAT included.",
  "Warranty terms and seller details are checked for each part.",
  "A screwdriver, thermal paste (if the cooler needs it) and a Windows licence are ready.",
]

export default function BuildAGamingPcUae() {
  return (
    <GuideShell
      crumbs={[{ label: "Home", href: "/" }, { label: "Guides", href: "/guides" }, { label: headline }]}
      title={headline}
      meta={<>By Ali Lari, founder of GG PC <span aria-hidden="true">/</span> Updated <time dateTime="2026-10-17">17 October 2026</time></>}
      lede={
        <div className="guide-answer frame">
          <h2>Short answer</h2>
          <p>Building a gaming PC in the UAE comes down to five moves. Set a budget in AED, choose parts in a set order, check that the parts are compatible, compare prices across UAE stores before you buy, then assemble the PC yourself or have it assembled. Do them in that order and most beginner mistakes disappear.</p>
        </div>
      }
      toc={toc}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <GuideSection id="budget" marker="1" title="Step 1: Set your budget in AED">
        <p>A PC budget in AED is the total you can spend on every part, and it decides what kind of gaming you can aim for. Here are three example tiers, matching the options in the <Link href="/#quest">GG PC build quest</Link>.</p>
        <table className="guide-table">
          <caption className="sr-only">Example budget tiers in AED</caption>
          <thead><tr><th scope="col">Budget</th><th scope="col">What it usually targets</th></tr></thead>
          <tbody>
            {tiers.map(tier => (
              <tr key={tier.budget}><th scope="row">{tier.budget}</th><td>{tier.aim.charAt(0).toUpperCase() + tier.aim.slice(1)}</td></tr>
            ))}
          </tbody>
        </table>
        <p>In every tier the graphics card typically takes the largest share of the budget, so protect that line first. <strong>These tiers are rough examples, not price quotes.</strong> Check current prices before you buy.</p>
      </GuideSection>

      <GuideSection id="parts" marker="2" title="Step 2: Choose parts in this order">
        <p>A sensible part order starts with the parts that limit your choices and ends with the ones that simply need to fit. Work down this list.</p>
        <ol className="guide-stats">
          {parts.map((part, i) => (
            <li key={part.name}><span className="stat-key"><span className="stat-index" aria-hidden="true">{i + 1}</span>{part.name}</span><span className="stat-text">{part.text.charAt(0).toUpperCase() + part.text.slice(1)}</span></li>
          ))}
        </ol>
      </GuideSection>

      <GuideSection id="compatibility" marker="3" title="Step 3: Check compatibility">
        <p>PC part compatibility is the check that every part physically and electrically works with the others. Run through these before you pay.</p>
        <ul className="guide-checks">
          {checks.map(check => (
            <li key={check.name}><Glyph name="check" size={16} /><span><strong>{check.name}:</strong> {check.text}</span></li>
          ))}
        </ul>
        <p>For a closer look at each check, read <Link href="/guides/pc-part-compatibility">PC part compatibility explained</Link>.</p>
        <aside className="guide-note frame" aria-label="About GG PC">
          <span className="guide-tag">At launch</span>
          <p>GG PC is being built to run these checks automatically at launch, so you see a warning as you add each part. Until then, the manufacturer spec pages are the source of truth.</p>
        </aside>
      </GuideSection>

      <GuideSection id="prices" marker="4" title="Step 4: Compare prices across UAE stores">
        <p>Comparing PC part prices across UAE stores is worth the effort because the same part can be priced differently from one seller to the next. Prices in the UAE include 5% VAT, which has been the UAE rate since 2018, so compare final prices rather than a headline figure.</p>
        <ul className="guide-bullets">
          <li>Look at the same exact model number at each store, not just the same product name.</li>
          <li>Check the warranty terms, and whether it is a local UAE warranty or an international one. That decides where you send the part if it fails.</li>
          <li>On marketplaces, check who the seller is and whether the store itself or a third party fulfils the order.</li>
          <li>Places UAE buyers commonly shop include Amazon.ae, noon, Microless and Computer Plaza in Dubai. These are examples only, and none of them is a GG PC partner. GG PC is not affiliated with any store.</li>
        </ul>
      </GuideSection>

      <GuideSection id="build" marker="5" title="Step 5: Build it, or have it built">
        <p>Assembling a gaming PC takes a couple of hours the first time, and a short order of work keeps it painless. Lay out a clean surface and follow this order.</p>
        <ol className="guide-order">
          <li>Install the CPU and RAM on the motherboard outside the case.</li>
          <li>Fit the cooler and the SSD, then mount the motherboard in the case.</li>
          <li>Install the power supply and connect the motherboard, CPU and drive cables.</li>
          <li>Fit the graphics card, connect its power cables, and tidy the cabling.</li>
          <li>Boot into the BIOS, then install Windows and the drivers.</li>
        </ol>
        <p>UAE outlets run on 230V and use Type G (three pin) plugs, and most PC power supplies handle that range, but check the voltage label on yours. If you would rather not build it yourself, GG PC is planning an optional build service for assembly, testing and delivery. It is planned, not live yet.</p>
      </GuideSection>

      <GuideSection id="checklist" marker="check" title="First build checklist">
        <p>A first build checklist is the final pass before you spend money. Tick off each item.</p>
        <ul className="guide-checklist">
          {checklist.map(item => (
            <li key={item}><span className="check-slot" aria-hidden="true" /><span>{item}</span></li>
          ))}
        </ul>
      </GuideSection>

      <GuideNext title="Next step">
        <p>GG PC is the tool being built to make these steps easier for UAE gamers. Join the GG PC waitlist for early access, or ask your build questions in the GG PC Discord.</p>
      </GuideNext>

      <BackToGuides />
    </GuideShell>
  )
}
