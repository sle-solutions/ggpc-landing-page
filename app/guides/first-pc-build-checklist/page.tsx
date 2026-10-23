import type { Metadata } from "next"
import Link from "next/link"
import { Glyph } from "@/components/pixel"
import { BackToGuides, GuideNext, GuideSection, GuideShell, type TocItem } from "@/components/guide-shell"

const site = "https://www.ggpc.app"
const url = `${site}/guides/first-pc-build-checklist`
const headline = "First PC build checklist: what to buy first and what to check (2026)"

export const metadata: Metadata = {
  title: `${headline} | GG PC`,
  description: "A plain English first PC build checklist: what to decide and buy first, what to check for each part, the order to assemble in and what to do at first boot.",
  alternates: { canonical: "/guides/first-pc-build-checklist" },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${url}#article`,
      headline,
      description: "A plain English checklist for a first gaming PC build: what to buy first, what to check for each part, assembly order and first boot checks.",
      datePublished: "2026-10-17",
      dateModified: "2026-10-21",
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
  { id: "budget", label: "Set a budget and a target", marker: "1" },
  { id: "cpu-gpu", label: "Pick the CPU and GPU first", marker: "2" },
  { id: "motherboard", label: "Motherboard to match the socket", marker: "3" },
  { id: "ram", label: "RAM: amount and type", marker: "4" },
  { id: "storage", label: "Storage", marker: "5" },
  { id: "psu", label: "Power supply", marker: "6" },
  { id: "case-cooler", label: "Case and cooler", marker: "7" },
  { id: "os", label: "Operating system licence", marker: "8" },
  { id: "prep", label: "Tools and prep", marker: "9" },
  { id: "assembly", label: "Assembly order", marker: "10" },
  { id: "first-boot", label: "First boot checks", marker: "11" },
  { id: "before-you-pay", label: "Before you pay", marker: "check" },
]

const assembly = [
  "Install the CPU and RAM on the motherboard while it is outside the case.",
  "Fit the CPU cooler and any M.2 SSD, then mount the motherboard in the case.",
  "Install the power supply and connect the motherboard, CPU and drive cables.",
  "Fit the graphics card and connect its power cables.",
  "Tidy the cables, close up the case and connect the monitor to the graphics card, not the motherboard.",
]

const firstBoot = [
  { name: "Enter the BIOS", text: "restart and press the key shown on screen at startup, often Delete or F2. Check the board's manual for yours." },
  { name: "Confirm detection", text: "the BIOS should show the full amount of RAM, your CPU and your drives. If something is missing, power off and reseat it." },
  { name: "Enable XMP or EXPO", text: "RAM often runs at a slower default speed until you turn on its rated profile. Intel boards call it XMP and AMD boards usually call it EXPO." },
  { name: "Update the BIOS if needed", text: "a new CPU may need a newer BIOS than the one on the board. Follow the board maker's instructions, and do not switch the PC off during an update." },
  { name: "Install drivers", text: "after Windows is installed, add the chipset driver from the motherboard or CPU maker, then the graphics driver from the GPU maker." },
]

const checklist = [
  "Budget, resolution and target frame rate are written down.",
  "The CPU socket matches the motherboard.",
  "The RAM type matches the motherboard.",
  "The GPU and cooler fit the case.",
  "The PSU has enough wattage and the right connectors, with headroom.",
  "An operating system licence is on the list.",
  "The total price includes 5% VAT.",
  "Warranty terms and seller details are checked for each part, and receipts are kept.",
]

export default function FirstPcBuildChecklist() {
  return (
    <GuideShell
      crumbs={[{ label: "Home", href: "/" }, { label: "Guides", href: "/guides" }, { label: headline }]}
      title={headline}
      meta={<>By Ali Lari, founder of GG PC <span aria-hidden="true">/</span> Updated <time dateTime="2026-10-17">17 October 2026</time></>}
      lede={
        <div className="guide-answer frame">
          <h2>What is the first thing I should buy when building a PC?</h2>
          <p>Nothing yet. First decide your budget and what you will use the PC for: which games, at what resolution and at what target frame rate. Then pick the CPU and graphics card, because they set the platform (the socket and RAM type) and the size of the power supply. Buy everything else to fit them. Do not buy parts one at a time before the full list has been checked, or you may end up with a part that does not fit the rest.</p>
        </div>
      }
      toc={toc}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <GuideSection id="budget" marker="1" title="Set a budget and a target">
        <p>Start with three decisions: how much you can spend, which games you want to play, and the resolution and frame rate you are aiming for. A 1080p screen at 60 frames per second asks much less of a PC than 1440p at 144. Write all three down, because every later choice depends on them.</p>
        <p>Leave a small buffer in the budget for things that are easy to forget, such as an operating system licence, cables and a monitor if you do not have one.</p>
      </GuideSection>

      <GuideSection id="cpu-gpu" marker="2" title="Pick the CPU and GPU first">
        <p>The CPU and graphics card come first because they decide most of what follows. The CPU sets the socket, which sets the motherboard and usually the RAM type. The graphics card sets the minimum power supply size and how large a case you need.</p>
        <p>For games, the graphics card usually has the biggest effect on frame rates, so it often takes the largest share of the budget. Pick a CPU that does not hold it back, and check the benchmarks for the games you actually play.</p>
      </GuideSection>

      <GuideSection id="motherboard" marker="3" title="Motherboard to match the socket">
        <p>The motherboard must have the same socket as the CPU. Also check the board's size (ATX, Micro-ATX or Mini-ITX), the number of M.2 slots and the RAM type it supports. Some boards need a BIOS update before they recognise a newer CPU, so check the CPU support list on the board maker's website. The <Link href="/guides/pc-part-compatibility">PC part compatibility guide</Link> covers each of these checks in detail.</p>
      </GuideSection>

      <GuideSection id="ram" marker="4" title="RAM: amount and type">
        <p>RAM has to be the type the board supports, such as DDR5 or DDR4. DDR4 and DDR5 are not interchangeable, so a DDR4 kit will not fit a DDR5 board.</p>
        <p>As common guidance, 16 GB is a typical baseline for gaming and 32 GB gives more room if you multitask heavily, for example by streaming or keeping many apps open while you play. Buy a matching kit of two sticks so the memory can run in dual channel.</p>
        <h3>Is 32GB RAM overkill for a gaming PC?</h3>
        <p>Usually not, but it is not required either. 16 GB is enough for most games for most players. 32 GB is a sensible choice if you stream, edit video, keep many apps or browser tabs open while you play, run heavily modded or very large games, or want headroom so you do not need to upgrade soon. On a tight budget, the money often helps more in the graphics card. Whichever you choose, check that the board supports the capacity and buy a matching two-stick kit.</p>
      </GuideSection>

      <GuideSection id="storage" marker="5" title="Storage">
        <p>Use an NVMe SSD for the operating system and your main games. It loads far faster than a hard drive. Pick a size that fits your game library, since modern games are large, and check that the board has a free M.2 slot that supports NVMe.</p>
      </GuideSection>

      <GuideSection id="psu" marker="6" title="Power supply">
        <p>Choose a power supply with enough wattage for the whole system, with headroom rather than running near its limit. Start from the graphics card maker's recommended PSU wattage. Pick a reputable model, because the PSU feeds every other part. Also check that it has the power cables your graphics card needs.</p>
      </GuideSection>

      <GuideSection id="case-cooler" marker="7" title="Case and cooler">
        <p>The case must fit your motherboard size, the length of the graphics card and the height of the CPU cooler. Good airflow matters too, and it is worth planning for in the UAE heat.</p>
        <p>Some CPUs come with a cooler in the box and some do not, so check the box contents of the CPU you chose. If you buy a separate cooler, confirm it supports your socket and fits under the case's side panel.</p>
      </GuideSection>

      <GuideSection id="os" marker="8" title="Operating system licence">
        <p>A new PC needs an operating system, and most gamers use Windows. Add the licence to your list, since it is a part of the cost that is easy to forget. You will usually install it from a USB drive made on another computer.</p>
      </GuideSection>

      <GuideSection id="prep" marker="9" title="Tools and prep">
        <p>You need little to build a PC, but have it ready before you start.</p>
        <ul className="guide-bullets">
          <li>A Phillips screwdriver, usually a magnetic one, is the main tool.</li>
          <li>A clear, well lit table with space to lay out the parts and a small bowl for screws.</li>
          <li>Anti-static practice: touch a bare metal part of the case now and then to discharge static, and hold boards and cards by their edges.</li>
          <li>The manuals for the motherboard and case, since they show where each cable goes.</li>
        </ul>
      </GuideSection>

      <GuideSection id="assembly" marker="10" title="Assembly order">
        <p>At a high level, the build goes in this order. The manuals show the exact steps for your parts.</p>
        <ol className="guide-order">
          {assembly.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <p>For a fuller walk through, including budgets and part order, see the <Link href="/guides/build-a-gaming-pc-uae">guide to building a gaming PC in the UAE</Link>.</p>
      </GuideSection>

      <GuideSection id="first-boot" marker="11" title="First boot checks">
        <p>The first time you power on, do these checks before you install games.</p>
        <ol className="guide-stats">
          {firstBoot.map((step, i) => (
            <li key={step.name}><span className="stat-key"><span className="stat-index" aria-hidden="true">{i + 1}</span>{step.name}</span><span className="stat-text">{step.text.charAt(0).toUpperCase() + step.text.slice(1)}</span></li>
          ))}
        </ol>
      </GuideSection>

      <GuideSection id="before-you-pay" marker="check" title="Before you pay">
        <p>This is the last pass before you spend money. Tick off each item.</p>
        <ul className="guide-checklist">
          {checklist.map(item => (
            <li key={item}><span className="check-slot" aria-hidden="true" /><span>{item}</span></li>
          ))}
        </ul>
        <aside className="guide-note frame" aria-label="A note for UAE buyers">
          <span className="guide-tag">UAE note</span>
          <p>Prices in the UAE include 5% VAT, so compare final prices. Confirm the warranty terms for each part, including whether the warranty is local or international, and keep your receipts in case you need to claim.</p>
        </aside>
      </GuideSection>

      <GuideNext title="Next step">
        <p>GG PC is the tool being built to make these checks easier for UAE gamers. It has not launched yet, and you can join the <Link href="/#signup">GG PC waitlist</Link> for early access.</p>
      </GuideNext>

      <BackToGuides />
    </GuideShell>
  )
}
