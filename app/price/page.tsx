import type { Metadata } from "next"
import { GuideSection, GuideShell } from "@/components/guide-shell"
import { ChipList } from "@/components/price-page"
import { fetchAllChips, summarize, type ChipSummary } from "@/lib/prices/catalog"

const site = "https://www.ggpc.app"
export const revalidate = 3600

export const metadata: Metadata = {
  title: "GPU and CPU prices in UAE today | GG PC",
  description: "Live prices for every graphics card and processor we track at Amazon.ae, noon, Microless, Gear-Up and GCC Gamers, with price history. Updated hourly, in AED.",
  alternates: { canonical: "/price" },
}

export default async function PriceHub() {
  const chips = (await fetchAllChips()).map(summarize)
  const byPrice = (a: ChipSummary, b: ChipSummary) => a.cheapest.price - b.cheapest.price
  const gpus = chips.filter(c => c.category === "GPU").sort(byPrice)
  const cpus = chips.filter(c => c.category === "CPU").sort(byPrice)
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", "@id": `${site}/price#page`, name: "GPU and CPU prices in UAE today", url: `${site}/price`, inLanguage: "en-AE", publisher: { "@id": `${site}/#organization` } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site },
        { "@type": "ListItem", position: 2, name: "UAE prices", item: `${site}/price` },
      ] },
    ],
  }
  return (
    <GuideShell
      crumbs={[{ label: "Home", href: "/" }, { label: "UAE prices" }]}
      title="UAE PC part prices today"
      sprite="gpu"
      meta={<>Tracking Amazon.ae, noon, Microless, Gear-Up and GCC Gamers <span aria-hidden="true">/</span> Updated hourly</>}
      lede={<p className="guide-lede">Pick a chip to see the cheapest in-stock price in the UAE, every store side by side and how the price has moved. Only prices seen in the last 7 days count.</p>}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <GuideSection id="gpus" marker="1" title={`Graphics cards (${gpus.length})`}>
        <ChipList chips={gpus} label="Graphics card prices" />
      </GuideSection>
      <GuideSection id="cpus" marker="2" title={`Processors (${cpus.length})`}>
        <ChipList chips={cpus} label="Processor prices" />
      </GuideSection>
    </GuideShell>
  )
}
