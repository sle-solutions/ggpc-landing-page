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
  const tier = LOADOUT_TIERS.find(t => t.id === sp.tier)
  const defaultBudget = LOADOUT_TIERS.find(t => t.id === DEFAULT_TIER)!.budgetAed
  const result = tier ? await fetchLoadouts() : null
  const pick = result && "loadouts" in result ? result.loadouts[LOADOUT_TIERS.indexOf(tier!)] : null
  return <>
    <Navbar />
    <main id="main-content" className="order builder">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="page-width order-wrap">
        <header className="order-head">
          <h1 className="order-h1">Build your PC</h1>
          <p>Set your budget and choose parts from UAE stores. Your estimate includes assembly and buyer protection.</p>
        </header>
        <WhiteFridayBuilderPromo forcePreview={allowWhiteFridayPreview(process.env)} />
        <CustomBuilder key={tier?.id ?? "custom"} initialBudget={tier?.budgetAed ?? defaultBudget}
          initialPick={pick && !("error" in pick) ? pick : null}
          generatedAt={result && "generatedAt" in result ? result.generatedAt : new Date().toISOString()}
          initialNotice={result && "error" in result ? "We cannot load price observations right now. Try again later." :
            pick && "error" in pick ? "No complete suggestion fits this budget. You can still choose individual parts." : ""} />
        <p className="order-disclosure">Each price shows when we last saw it at a UAE store. We confirm prices and stock when preparing your quote.</p>
      </div>
    </main>
    <Footer />
  </>
}
