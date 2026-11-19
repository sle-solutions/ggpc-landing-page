import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomBuilder } from "@/components/custom-builder"
import { DEFAULT_TIER, LOADOUT_TIERS, fetchLoadouts } from "@/lib/order/loadouts"
import { WhiteFridayBuilderPromo } from "@/components/white-friday-campaign"
import { allowWhiteFridayPreview } from "@/lib/campaign/white-friday"

const site = "https://www.ggpc.app"

export const metadata: Metadata = {
  title: "PC builder: custom UAE gaming PCs | GG PC",
  description: "Plan a gaming PC using UAE store price observations and compatibility checks. Set your budget, swap parts and request a build quote.",
  alternates: { canonical: "/builder" },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${site}/builder#webpage`,
      url: `${site}/builder`,
      name: "PC builder: custom UAE gaming PCs",
      description: "Plan a gaming PC using UAE store price observations and compatibility checks. Set your budget, swap parts and request a build quote.",
      inLanguage: "en-AE",
      isPartOf: { "@id": `${site}/#website` },
      publisher: { "@id": `${site}/#organization` },
      about: { "@id": `${site}/#organization` },
      breadcrumb: { "@id": `${site}/builder#breadcrumb` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${site}/builder#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site },
        { "@type": "ListItem", position: 2, name: "Builder", item: `${site}/builder` },
      ],
    },
  ],
}

export default async function BuilderPage({ searchParams }: { searchParams: Promise<{ tier?: string | string[] }> }) {
  const sp = await searchParams
  const tier = LOADOUT_TIERS.find(t => t.id === sp.tier) ?? LOADOUT_TIERS.find(t => t.id === DEFAULT_TIER)!
  const result = await fetchLoadouts()
  const pick = "loadouts" in result ? result.loadouts[LOADOUT_TIERS.indexOf(tier)] : null
  return <>
    <Navbar />
    <main id="main-content" className="order builder studio">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="page-width order-wrap">
        <header className="order-head">
          <h1 className="order-h1">Build your PC</h1>
          <p>Get a build for your budget. Tap any part to swap it.</p>
        </header>
        <WhiteFridayBuilderPromo forcePreview={allowWhiteFridayPreview(process.env)} />
        <CustomBuilder key={tier.id} initialBudget={tier.budgetAed}
          initialPick={pick && !("error" in pick) ? pick : null}
          generatedAt={"generatedAt" in result ? result.generatedAt : new Date().toISOString()}
          initialNotice={"error" in result ? "We cannot load price observations right now. Try again later." :
            pick && "error" in pick ? "No complete suggestion fits this budget. You can still choose individual parts." : ""} />
        <p className="order-disclosure">UAE store prices. Final prices and stock are confirmed with your quote.</p>
      </div>
    </main>
    <Footer />
  </>
}
