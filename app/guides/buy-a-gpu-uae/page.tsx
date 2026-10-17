import type { Metadata } from "next"
import Link from "next/link"
import { Glyph } from "@/components/pixel"
import { BackToGuides, GuideNext, GuideSection, GuideShell, type TocItem } from "@/components/guide-shell"

const site = "https://www.ggpc.app"
const url = `${site}/guides/buy-a-gpu-uae`
const headline = "How to buy a graphics card in the UAE (2026)"

export const metadata: Metadata = {
  title: `${headline} | GG PC`,
  description: "A plain English guide to buying a graphics card in the UAE: match it to your monitor, check VRAM and fit, understand NVIDIA, AMD and Intel, and check warranty and seller before you pay.",
  alternates: { canonical: "/guides/buy-a-gpu-uae" },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${url}#article`,
      headline,
      description: "A plain English guide to buying a graphics card for a gaming PC in the UAE, from resolution and VRAM to fit, warranty and seller checks.",
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
  { id: "resolution", label: "Pick by resolution and refresh rate", marker: "1" },
  { id: "vram", label: "How much VRAM", marker: "2" },
  { id: "brands", label: "NVIDIA, AMD and Intel", marker: "3" },
  { id: "partners", label: "Board partner models", marker: "4" },
  { id: "fit", label: "Check it fits your build", marker: "5" },
  { id: "uae", label: "Buying in the UAE", marker: "6" },
  { id: "timing", label: "When to buy", marker: "7" },
  { id: "checklist", label: "Before you pay", marker: "check" },
]

const resolutions = [
  { res: "1080p", aim: "the lightest load on a graphics card, so it is the usual target for tighter budgets and for players who want very high refresh rates in fast games." },
  { res: "1440p", aim: "a sharper picture than 1080p and a common middle ground. It asks more of the graphics card, so it usually means a stronger card." },
  { res: "4K", aim: "the sharpest picture and the heaviest load. It generally needs the most powerful cards, plus a monitor and budget to match." },
]

const fitChecks = [
  { name: "Length", text: "compare the card length with the maximum GPU length in the case specs, and leave a little room for cables and front fans." },
  { name: "Slot width", text: "cards cover two, three or more expansion slots. A thick card can block the slot beneath it." },
  { name: "Case clearance", text: "check the width of the case and the space around the card, not just the length." },
  { name: "PSU wattage", text: "use the power supply wattage the card maker recommends on its product page, and add headroom." },
  { name: "Power connector", text: "cards use one or more 8-pin PCIe cables, or the 12V-2x6 connector (a revised 12VHPWR). Check your PSU has the cables your card needs." },
]

const checklist = [
  "The card suits your monitor's resolution and refresh rate.",
  "The VRAM is enough for the resolution and texture settings you want.",
  "The length, slot width and case clearance fit your case.",
  "The PSU meets the maker's recommended wattage and has the right power cables.",
  "You are comparing the same exact model number across sellers, with VAT included.",
  "You know whether the warranty is local or international, and who handles claims.",
  "The seller is clear, and you will get an invoice you can keep.",
  "If the card is used or a grey import, you can test it before you pay.",
]

export default function BuyAGpuUae() {
  return (
    <GuideShell
      crumbs={[{ label: "Home", href: "/" }, { label: "Guides", href: "/guides" }, { label: headline }]}
      title={headline}
      meta={<>By Ali Lari, founder of GG PC <span aria-hidden="true">/</span> Updated <time dateTime="2026-10-17">17 October 2026</time></>}
      lede={
        <div className="guide-answer frame">
          <h2>Short answer</h2>
          <p>To buy a graphics card in the UAE, match the card to your monitor resolution, refresh rate and budget, check the VRAM suits the settings you want, make sure its size, power needs and connectors fit your build, and confirm the warranty and the seller before you pay. The graphics card is usually the biggest single spend in a gaming PC, so these checks are worth doing in order.</p>
        </div>
      }
      toc={toc}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <GuideSection id="resolution" marker="1" title="Pick by resolution and refresh rate">
        <p>A graphics card has to draw every frame on your screen, so the right card depends on your monitor. Start with its resolution and refresh rate, then set a budget in AED. The <Link href="/guides/build-a-gaming-pc-uae">UAE build guide</Link> shows how the graphics card fits into the rest of the budget.</p>
        <table className="guide-table">
          <caption className="sr-only">Common monitor resolutions and what they ask of a graphics card</caption>
          <thead><tr><th scope="col">Resolution</th><th scope="col">What it means for the card</th></tr></thead>
          <tbody>
            {resolutions.map(row => (
              <tr key={row.res}><th scope="row">{row.res}</th><td>{row.aim.charAt(0).toUpperCase() + row.aim.slice(1)}</td></tr>
            ))}
          </tbody>
        </table>
        <p>Refresh rate matters too. A high refresh rate monitor only helps if the card can produce enough frames to use it, and a higher resolution makes that harder. Buying a card far beyond what your monitor can show is wasted money, and a card well below it will hold the monitor back.</p>
      </GuideSection>

      <GuideSection id="vram" marker="2" title="How much VRAM">
        <p>VRAM is the memory on the graphics card itself. It holds textures and other game data, so it matters more at higher resolutions and higher texture settings.</p>
        <ul className="guide-bullets">
          <li>If a game needs more VRAM than your card has, it can stutter or you may have to lower texture quality.</li>
          <li>VRAM is not the whole story. Two cards with the same amount can perform very differently, because the chip matters more.</li>
          <li>As a general guide, think about the resolution you will play at and the texture settings you want, then check the VRAM against that. Games and settings change, so look at current recommendations for the games you play.</li>
        </ul>
      </GuideSection>

      <GuideSection id="brands" marker="3" title="NVIDIA, AMD and Intel">
        <p>Three companies make the graphics chips in gaming cards: NVIDIA, AMD and Intel. Each has its own range, and each has an upscaling feature that renders the game at a lower resolution and scales it up to boost frame rates: DLSS from NVIDIA, FSR from AMD and XeSS from Intel.</p>
        <ul className="guide-bullets">
          <li>Not every game supports every upscaler, so check the games you play.</li>
          <li>Some features need specific card generations, so read the card maker's spec page.</li>
          <li>Look at independent reviews of the exact card for performance in your games, rather than relying on brand loyalty.</li>
        </ul>
      </GuideSection>

      <GuideSection id="partners" marker="4" title="Board partner models">
        <p>The same graphics chip is often sold by several companies, called board partners. Each builds its own card around the chip, so two cards with the same name can still differ.</p>
        <ul className="guide-bullets">
          <li>Cooler: some have bigger coolers and more fans, which can mean quieter running.</li>
          <li>Size: bigger coolers usually mean longer, thicker cards, so check the fit.</li>
          <li>Clocks: some models ship with factory settings tuned for slightly higher speeds.</li>
        </ul>
        <p>When you compare prices, compare the exact model, not just the chip name.</p>
      </GuideSection>

      <GuideSection id="fit" marker="5" title="Check it fits your build">
        <p>A great card is no use if it will not fit or power up. Run these checks before you buy. Each one is covered in more depth in <Link href="/guides/pc-part-compatibility">PC part compatibility explained</Link>.</p>
        <ul className="guide-checks">
          {fitChecks.map(check => (
            <li key={check.name}><Glyph name="check" size={16} /><span><strong>{check.name}:</strong> {check.text}</span></li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="uae" marker="6" title="Buying in the UAE">
        <p>Where you buy matters as much as what you buy. These are the points that change the outcome for UAE buyers.</p>
        <ul className="guide-bullets">
          <li>VAT: prices in the UAE include 5% VAT, so compare final prices.</li>
          <li>Warranty: check whether it is a local UAE warranty or an international one, and who handles claims: the seller, a distributor or the brand. That decides where you go if the card fails.</li>
          <li>Invoice: keep the invoice. You will usually need it for any warranty claim.</li>
          <li>Same model: compare the exact model number across sellers, not just the chip name.</li>
          <li>Grey imports: a card brought in outside the brand's official channel may have a warranty you cannot use locally. Ask the seller directly.</li>
          <li>Used cards: ask for the invoice, test the card before you pay, and look for signs of heavy past use such as dirty fans or worn fittings. Cards that ran for long periods, for example in crypto mining, can wear faster, so be cautious.</li>
        </ul>
        <aside className="guide-note frame" aria-label="About GG PC">
          <span className="guide-tag">At launch</span>
          <p>GG PC is being built to show UAE store prices side by side in AED, so comparing one model across sellers takes less legwork. It has not launched yet, and the waitlist is open.</p>
        </aside>
      </GuideSection>

      <GuideSection id="timing" marker="7" title="When to buy">
        <p>New graphics card generations launch periodically, and new models can change how older ones are priced and stocked. If you need a PC now, buy what suits your needs and budget today. If you can wait, you can watch for new announcements from the chip makers, but waiting has no guaranteed payoff, because there is always a newer card coming.</p>
      </GuideSection>

      <GuideSection id="checklist" marker="check" title="Before you pay">
        <p>Run through this list once you have a card in mind.</p>
        <ul className="guide-checklist">
          {checklist.map(item => (
            <li key={item}><span className="check-slot" aria-hidden="true" /><span>{item}</span></li>
          ))}
        </ul>
        <p>Planning your first PC? The <Link href="/guides/first-pc-build-checklist">first PC build checklist</Link> covers what to buy first and what to check at first boot.</p>
      </GuideSection>

      <GuideNext title="Next step">
        <p>GG PC is the tool being built to make part choices easier for UAE gamers. Join the <Link href="/#signup">GG PC waitlist</Link> for early access, or ask your build questions in the GG PC Discord.</p>
      </GuideNext>

      <BackToGuides />
    </GuideShell>
  )
}
