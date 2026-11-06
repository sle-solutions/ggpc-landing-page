import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Glyph } from "@/components/pixel"
import { formatAed, seenAgo } from "@/lib/order/format"
import { allInFils, DEFAULT_TIER, fetchLoadouts, LOADOUT_TIERS, loadoutCode, loadoutAgeSeconds } from "@/lib/order/loadouts"
import type { Loadout, TierId } from "@/lib/order/loadouts"
import { ORDER, PROTECTION_FEE_LABEL, SOURCING_FEE_LABEL } from "@/lib/order/config"
import { RETAILER_NAMES, SLOT_LABELS } from "@/lib/order/types"
import { buildWhatsAppQuoteUrl, configuredWhatsAppNumber } from "@/lib/order/whatsapp"
import { RetailerMark, WhatsAppMark } from "@/components/retailer-brand"
import { WhiteFridayBuilderPromo } from "@/components/white-friday-campaign"
import { allowWhiteFridayPreview } from "@/lib/campaign/white-friday"

const site = "https://www.ggpc.app"

export const metadata: Metadata = {
  title: "PC builder: UAE gaming loadouts | GG PC",
  description: "Plan a gaming PC using UAE store price observations and compatibility checks. Choose a budget and request a GG PC build quote.",
  alternates: { canonical: "/builder" },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${site}/builder#webpage`,
      url: `${site}/builder`,
      name: "PC builder: UAE gaming loadouts",
      description: "Plan a gaming PC using UAE store price observations and compatibility checks. Choose a budget and request a GG PC build quote.",
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
  const tierId: TierId = LOADOUT_TIERS.some(t => t.id === sp.tier) ? (sp.tier as TierId) : DEFAULT_TIER
  const index = LOADOUT_TIERS.findIndex(t => t.id === tierId)
  const tier = LOADOUT_TIERS[index]
  const result = await fetchLoadouts()
  const picked = "error" in result ? null : result.loadouts[index]

  return (
    <>
      <Navbar />
      <main id="main-content" className="order builder">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        <div className="page-width order-wrap">
          <header className="order-head">
            <h1 className="order-h1">Pick your loadout.</h1>
            <p>Start a gaming PC plan with UAE store price observations and compatibility checks. Choose a budget, then ask GG PC for a build quote.</p>
          </header>

          <nav className="builder-tiers" aria-label="Budget">
            {LOADOUT_TIERS.map(t => (
              <a key={t.id} href={`/builder?tier=${t.id}`} aria-current={t.id === tierId ? "page" : undefined}>
                <span className="builder-tier-name">{t.name}</span>
                <span className="builder-tier-budget">{formatAed(t.budgetAed * 100)}</span>
              </a>
            ))}
          </nav>

          <WhiteFridayBuilderPromo forcePreview={allowWhiteFridayPreview(process.env)} />

          <div id="loadout-result">{"error" in result ? (
            <p className="order-note order-banner" role="status">We cannot load price observations right now. Try again later.</p>
          ) : !picked || "error" in picked ? (
            <p className="order-note order-banner" role="status">Prices moved and no build fits {formatAed(tier.budgetAed * 100)} right now. Try the next budget up.</p>
          ) : (
            <LoadoutCard name={`GG PC ${tier.name} loadout`} budgetAed={tier.budgetAed} loadout={picked} generatedAt={result.generatedAt} />
          )}</div>

          <p className="order-disclosure">Chosen from catalog observations at supported UAE stores. Each part shows when its price was last seen. Prices and stock can change; we confirm them when preparing your quote.</p>
        </div>
      </main>
      <Footer />
    </>
  )
}

function LoadoutCard({ name, budgetAed, loadout, generatedAt }: { name: string; budgetAed: number; loadout: Loadout; generatedAt: string }) {
  const code = loadoutCode(name, loadout)
  const t = allInFils(loadout.partsTotal)
  const whatsappUrl = buildWhatsAppQuoteUrl({ number: configuredWhatsAppNumber(), buildName: name, code, totalFils: t.totalFils })
  const boxedCooler = !loadout.parts.some(p => p.slot === "CPU_COOLER")
  const renderedAt = Date.now()
  return (
    <div className="order-grid builder-grid">
      <section className="order-parts frame" aria-labelledby="loadout-title">
        <div className="builder-headline">
          <h2 id="loadout-title" className="order-h2">{loadout.cpu} + {loadout.gpu}</h2>
          <p className={loadout.fit === "ok" ? "builder-fit" : "builder-fit builder-fit-warn"}>
            <Glyph name="check" size={16} />{loadout.fit === "ok" ? "Compatibility checks passed" : "Check compatibility notes"}
          </p>
        </div>
        {loadout.notes.length > 0 && <ul className="builder-notes">{loadout.notes.map(n => <li key={n}>{n}</li>)}</ul>}
        <ul className="order-list">
          {loadout.parts.map(p => (
            <li key={p.slot} className="order-part">
              <span className="order-slot">{SLOT_LABELS[p.slot]}</span>
              <span className="order-title" title={p.title}>{p.name}</span>
              <span className="order-store"><RetailerMark retailer={p.retailer} />{RETAILER_NAMES[p.retailer]}</span>
              <span className="order-price"><strong>{formatAed(Math.round(p.price * 100))}</strong><small>{seenAgo(loadoutAgeSeconds(p.ageSeconds, generatedAt, renderedAt))}</small></span>
            </li>
          ))}
          {boxedCooler && <li className="order-part"><span className="order-slot">{SLOT_LABELS.CPU_COOLER}</span><span className="order-title order-muted">Stock cooler expected. Confirm it is included with the CPU.</span></li>}
        </ul>
      </section>

      <aside className="order-panel frame" aria-labelledby="loadout-total">
        <h2 id="loadout-total" className="order-h2">Build estimate</h2>
        <dl className="order-totals">
          <div><dt>Parts at store prices</dt><dd>{formatAed(t.partsFils)}</dd></div>
          <div><dt>{SOURCING_FEE_LABEL}</dt><dd>{formatAed(t.sourcingFils)}</dd></div>
          <div><dt>Build fee</dt><dd>{formatAed(t.buildFils)}</dd></div>
          <div><dt>{PROTECTION_FEE_LABEL}</dt><dd>{formatAed(t.protectionFils)}</dd></div>
          <div className="order-total-row"><dt>Total</dt><dd>{formatAed(t.totalFils)}</dd></div>
        </dl>
        <p className="order-hint">Within your {formatAed(budgetAed * 100)} budget. Assembled, stress tested and covered by a 2-year labour warranty.</p>
        <a className="btn btn-primary builder-cta" href={`/build/${code}`}>Have it built<Glyph name="arrowRight" size={16} /></a>
        {whatsappUrl && <a className="btn btn-whatsapp builder-whatsapp" href={whatsappUrl} target="_blank" rel="noopener noreferrer"><WhatsAppMark />Get a quote on WhatsApp</a>}
        <a className="builder-alt" href={`/build/${code}?lane=b`}>Buy the parts yourself, we build it for {formatAed(ORDER.buildFeeFils + ORDER.protectionFeeFils)}</a>
      </aside>

      {/* Phones: the total and the main action stay on screen while scrolling the parts. */}
      <div className="builder-bar">
        <span><small>Build estimate</small><strong>{formatAed(t.totalFils)}</strong></span>
        <div className="builder-bar-actions">
          <a className="btn btn-primary" href={`/build/${code}`}>Have it built</a>
          {whatsappUrl && <a className="btn btn-whatsapp" href={whatsappUrl} target="_blank" rel="noopener noreferrer"><WhatsAppMark />WhatsApp quote</a>}
        </div>
      </div>
    </div>
  )
}
