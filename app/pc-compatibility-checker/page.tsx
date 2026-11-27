import type { Metadata } from "next"
import Link from "next/link"
import { GuideChecklist, BackToGuides, GuideNext, GuideSection, GuideShell, type TocItem } from "@/components/guide-shell"

const site = "https://www.ggpc.app"
const url = `${site}/pc-compatibility-checker`
const headline = "PC compatibility checker: check your PC parts fit before you buy"

export const metadata: Metadata = {
  title: `${headline} | GG PC`,
  description: "Check PC part compatibility as you pick parts: CPU socket, RAM type, power supply size, graphics card length, case size, cooler fit, BIOS and M.2 slots. Prices from UAE stores in AED.",
  alternates: { canonical: "/pc-compatibility-checker" },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: headline,
      description: "What the GG PC compatibility checker checks, how it estimates power, what its results mean and what you still need to check yourself.",
      inLanguage: "en-AE",
      datePublished: "2026-11-27",
      dateModified: "2026-11-27",
      isPartOf: { "@id": `${site}/#website` },
      publisher: { "@id": `${site}/#organization` },
      breadcrumb: { "@id": `${url}#breadcrumb` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site },
        { "@type": "ListItem", position: 2, name: "PC compatibility checker", item: url },
      ],
    },
  ],
}

const toc: TocItem[] = [
  { id: "how-to-check", label: "How do I check if my PC parts are compatible?", marker: "1" },
  { id: "what-it-checks", label: "What the checker checks", marker: "2" },
  { id: "power", label: "How the power supply check works", marker: "3" },
  { id: "results", label: "What the results mean", marker: "4" },
  { id: "manual-checks", label: "What no checker can promise", marker: "5" },
  { id: "before-you-buy", label: "Before you buy", marker: "check" },
]

const checks = [
  { area: "CPU and motherboard", catches: "A CPU socket that does not match the motherboard, a laptop CPU in a desktop list, and boards that need a BIOS update before they can run your CPU." },
  { area: "Memory (RAM)", catches: "DDR4 on a DDR5 board or the other way round, laptop sized SO-DIMM sticks, more sticks than the board has slots, and four DDR5 sticks, which may run slower." },
  { area: "Power supply", catches: "A power supply that is too weak or tight for the estimated draw, or below the graphics card maker's recommendation. It also notes when the card uses the newer 16-pin plug." },
  { area: "Graphics card and case", catches: "A card that is too long for the case, or within 10 mm of the limit. It also flags a CPU with no built-in graphics when the list has no graphics card." },
  { area: "Motherboard and case", catches: "A motherboard too big for the case, and back-connect boards (BTF or Project Zero) that need a case with matching cut-outs." },
  { area: "CPU cooler", catches: "A cooler that does not support the CPU socket, one too tall for the case, a radiator too big for it, a cooler rated for less heat than the CPU, and a CPU with no cooler in the box and none in the list." },
  { area: "Storage", catches: "More M.2 SSDs than the motherboard has M.2 slots." },
]

const checklist = [
  "The checker shows no errors, and you have read every warning.",
  "Any \"couldn't verify\" notes were checked on the manufacturer's spec page.",
  "The case maker's limits for graphics card length, cooler height and radiator size match your parts.",
  "The motherboard's support list includes your CPU, or the BIOS is updated first.",
  "Front panel, fan and RGB headers are enough for your case and fans.",
  "Final prices and stock were confirmed at the store.",
]

export default function PcCompatibilityChecker() {
  return (
    <GuideShell
      crumbs={[{ label: "Home", href: "/" }, { label: "PC compatibility checker" }]}
      title="PC compatibility checker"
      sprite="motherboard"
      meta={<>By Ali Lari, founder of GG PC <span aria-hidden="true">/</span> Updated <time dateTime="2026-11-27">November 27, 2026</time></>}
      lede={<p className="guide-lede">Pick your parts in the <Link href="/builder">GG PC builder</Link> and it checks them against each other as you go. It flags parts that will not work together, warns about tight fits and estimates the power supply you need. Prices come from UAE stores, in AED.</p>}
      toc={toc}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <GuideSection id="how-to-check" marker="1" title="How do I check if my PC parts are compatible?">
        <p>Check the parts in pairs, starting with the ones that decide the rest. The CPU socket must match the motherboard, and the memory type must match the board. The power supply must cover the CPU and graphics card with room to spare. Then the graphics card, motherboard and cooler must physically fit in the case.</p>
        <ol className="guide-order">
          <li>Open the <Link href="/builder">builder</Link> and set your budget in AED.</li>
          <li>Pick a CPU first, then a motherboard. Choices that clash with parts you already picked are blocked, with the reason shown.</li>
          <li>Add memory, graphics card, storage, power supply, case and cooler.</li>
          <li>Read the fit panel. It lists any conflicts, the estimated peak power draw and the recommended power supply size.</li>
        </ol>
        <p>The <Link href="/guides/pc-part-compatibility">PC part compatibility guide</Link> explains each check in plain English if you want to do it by hand.</p>
      </GuideSection>

      <GuideSection id="what-it-checks" marker="2" title="What the checker checks">
        <table className="guide-table">
          <caption className="sr-only">Compatibility checks in the GG PC builder</caption>
          <thead><tr><th scope="col">Parts</th><th scope="col">What it catches</th></tr></thead>
          <tbody>
            {checks.map(row => (
              <tr key={row.area}><th scope="row">{row.area}</th><td>{row.catches}</td></tr>
            ))}
          </tbody>
        </table>
      </GuideSection>

      <GuideSection id="power" marker="3" title="How the power supply check works">
        <p>The estimate adds the CPU&apos;s rated power, the graphics card&apos;s board power and 100 W for everything else, such as the motherboard, memory, drives and fans. The recommended power supply is 1.4 times that estimate, rounded up to a common size. It never goes below the graphics card maker&apos;s own recommendation.</p>
        <p>Here is an example. A 65 W CPU and a 220 W graphics card come to 385 W with the 100 W allowance. Times 1.4, that is 539 W, so the checker recommends a 550 W power supply. The common sizes it rounds to are 450, 550, 650, 750, 850, 1000, 1200 and 1600 W. A power supply below 1.25 times the estimate gets a warning that it is tight.</p>
      </GuideSection>

      <GuideSection id="results" marker="4" title="What the results mean">
        <ul className="guide-bullets">
          <li><strong>Error:</strong> the parts will not work together, such as a CPU and motherboard with different sockets. Swap one of them before you buy.</li>
          <li><strong>Warning:</strong> the build can work, but something needs a look, such as a graphics card within 10 mm of the case limit or a small cooler on a hot CPU.</li>
          <li><strong>Note:</strong> useful to know, such as a BIOS update or a 16-pin power adapter. Notes also appear when a store listing does not give the spec needed for a check. In that case the checker says it could not verify, rather than guessing.</li>
        </ul>
      </GuideSection>

      <GuideSection id="manual-checks" marker="5" title="What no checker can promise">
        <p>The checker reads part specs from UAE store listings, and listings can be incomplete or wrong. Treat a clean result as a strong first pass, not a guarantee. Confirm the exact model on the manufacturer&apos;s spec page before you pay.</p>
        <p>A few things are worth checking by hand on any build. These include front panel connectors, the number of fan and RGB headers, and the motherboard&apos;s CPU support list. If you would rather someone else checks and builds it, the <Link href="/warranty">build QA page</Link> shows what GG PC tests on every build it assembles.</p>
      </GuideSection>

      <GuideSection id="before-you-buy" marker="check" title="Before you buy">
        <GuideChecklist items={checklist} />
      </GuideSection>

      <GuideNext title="Check your parts now">
        <p>Pick parts with UAE prices in AED and see conflicts as you go, or ask the community.</p>
      </GuideNext>

      <BackToGuides />
    </GuideShell>
  )
}
