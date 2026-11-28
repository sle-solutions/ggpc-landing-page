import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { GuideSection, GuideShell } from "@/components/guide-shell"
import { InstallButton } from "@/components/install-button"
import { Glyph } from "@/components/pixel"
import { aed, ChipList, OfferTable, PriceChart, shortDate, unit, verdictText } from "@/components/price-page"
import { RETAILER_NAMES } from "@/lib/order/types"
import { cheapestPerStore, chipPath, dubaiDay, fetchChip, fetchHistory, slugFromParam, summarize, verdict } from "@/lib/prices/catalog"

const site = "https://www.ggpc.app"

// On-demand ISR: pages render on first visit and refresh hourly from the price API.
export const revalidate = 3600
export function generateStaticParams() { return [] }

async function load(param: string) {
  const slug = slugFromParam(param)
  if (!slug) return null
  return fetchChip(slug)
}

export async function generateMetadata({ params }: { params: Promise<{ chip: string }> }): Promise<Metadata> {
  const { chip: param } = await params
  const found = await load(param)
  if (!found) return { title: "Price not found | GG PC", robots: { index: false, follow: true } }
  const { chip } = found
  const s = summarize(chip)
  return {
    title: `${chip.name} price in UAE today: from ${aed(s.cheapest.price)} | GG PC`,
    description: `Cheapest ${chip.brand} ${chip.name} in the UAE right now is ${aed(s.cheapest.price)} at ${RETAILER_NAMES[s.cheapest.retailer]}. Compare ${s.cards} ${unit(chip.category, s.cards)} across ${s.stores} UAE ${s.stores === 1 ? "store" : "stores"}, with price history. Updated hourly.`,
    alternates: { canonical: chipPath(chip.slug) },
  }
}

export default async function ChipPricePage({ params }: { params: Promise<{ chip: string }> }) {
  const { chip: param } = await params
  const found = await load(param)
  if (!found) notFound()
  const { chip, siblings } = found
  const now = Date.now()
  const today = dubaiDay(now)
  const s = summarize(chip)
  const best = s.cheapest
  const history = await fetchHistory(chip)
  const call = verdictText(verdict(history, best.price, today), best.price)
  const perStore = cheapestPerStore(chip)
  const inStock = chip.offers.filter(o => o.inStock)
  const priciest = inStock[inStock.length - 1]
  const gap = perStore.length > 1 ? perStore[perStore.length - 1].price - perStore[0].price : 0
  const url = `${site}${chipPath(chip.slug)}`
  const fullName = `${chip.brand} ${chip.name}`
  const updated = new Date(now).toLocaleString("en-GB", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" })

  const faq = [
    { q: `How much is the ${chip.name} in the UAE?`, a: `The cheapest in-stock ${chip.name} we found in the UAE is ${aed(best.price)} for the ${best.name} at ${RETAILER_NAMES[best.retailer]}. In-stock prices across ${s.cards} ${unit(chip.category, s.cards)} range up to ${aed(priciest.price)}. Store prices include 5% VAT.` },
    { q: `Which UAE store has the cheapest ${chip.name}?`, a: perStore.length > 1 ? `Right now ${RETAILER_NAMES[perStore[0].retailer]} has the lowest in-stock price at ${aed(perStore[0].price)}. The cheapest offer at each store differs by up to ${aed(gap)}, so it pays to compare before you buy.` : `Right now only ${RETAILER_NAMES[best.retailer]} has a recent in-stock price, at ${aed(best.price)}.` },
    { q: `Is now a good time to buy the ${chip.name}?`, a: call.line },
  ]
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product", "@id": `${url}#product`, name: fullName, category: chip.category === "GPU" ? "Graphics card" : "Processor",
        brand: { "@type": "Brand", name: chip.brand.split(" ")[0] },
        offers: { "@type": "AggregateOffer", priceCurrency: "AED", lowPrice: best.price, highPrice: priciest.price, offerCount: inStock.length, availability: "https://schema.org/InStock" },
      },
      { "@type": "FAQPage", "@id": `${url}#faq`, mainEntity: faq.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
      { "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`, itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site },
        { "@type": "ListItem", position: 2, name: "UAE prices", item: `${site}/price` },
        { "@type": "ListItem", position: 3, name: `${chip.name} price`, item: url },
      ] },
    ],
  }

  return (
    <GuideShell
      crumbs={[{ label: "Home", href: "/" }, { label: "UAE prices", href: "/price" }, { label: `${chip.name} price` }]}
      title={`${chip.name} price in UAE`}
      sprite={chip.category === "GPU" ? "gpu" : "cpu"}
      meta={<>Live from {s.stores} UAE {s.stores === 1 ? "store" : "stores"} <span aria-hidden="true">/</span> Updated <time dateTime={new Date(now).toISOString()}>{updated}</time> Dubai time</>}
      lede={<p className="guide-lede">The cheapest {fullName} in the UAE right now is <strong>{aed(best.price)}</strong> for the {best.name} at {RETAILER_NAMES[best.retailer]}. We compare every {chip.name} we find at Amazon.ae, noon, Microless, Gear-Up and GCC Gamers, and only show prices seen in the last 7 days.</p>}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="price-hero frame" aria-label="Cheapest today">
        <div className="price-hero-main">
          <span className="guide-tag">Cheapest today</span>
          <p className="price-hero-amount">{aed(best.price)}</p>
          <p className="price-hero-where">{best.name} at {RETAILER_NAMES[best.retailer]}</p>
        </div>
        <div className={`price-call price-call-${call.tone}`}>
          <span className="guide-tag">{call.tag}</span>
          <p>{call.line}</p>
        </div>
        <div className="price-hero-actions">
          <a className="btn btn-primary" href={best.url} target="_blank" rel="nofollow noopener noreferrer">View at {RETAILER_NAMES[best.retailer]}<Glyph name="arrowUpRight" size={16} /></a>
          <Link className="btn btn-ghost" href="/builder">Build a PC around it<Glyph name="arrowRight" size={16} /></Link>
        </div>
      </section>

      <GuideSection id="history" marker="1" title={`${chip.name} price history in the UAE`}>
        <PriceChart days={history.days} name={chip.name} />
        {history.low && history.first ? <p>The lowest in-stock {chip.name} price we have recorded is {aed(history.low.price)} on {shortDate(history.low.day)}, since tracking began on {shortDate(history.first)}.</p> : null}
      </GuideSection>

      {perStore.length > 1 ? (
        <GuideSection id="by-store" marker="2" title={`Cheapest ${chip.name} at each UAE store`}>
          <ul className="price-store-list">
            {perStore.map(o => <li key={o.retailer}><span>{RETAILER_NAMES[o.retailer]}</span><strong>{aed(o.price)}</strong></li>)}
          </ul>
          <p>Same chip, different stores: the cheapest offers differ by {aed(gap)} today.</p>
        </GuideSection>
      ) : null}

      <GuideSection id="offers" marker="3" title={`Every ${chip.name} we found`}>
        <OfferTable offers={chip.offers.slice(0, 40)} now={now} />
        <p className="price-note">Prices come from the stores and include 5% VAT. Stock and prices change, so confirm at the store before you pay. GG PC does not sell parts and these links carry no affiliate tags.</p>
      </GuideSection>

      <section className="guide-next frame" aria-labelledby="track-title">
        <h2 id="track-title">Get pinged when it drops</h2>
        <p>The GG PC Chrome extension tracks {chip.name} prices across UAE stores and shows the cheapest one while you shop.</p>
        <div className="guide-next-actions">
          <InstallButton />
          <Link className="btn btn-ghost" href="/builder">Open the builder<Glyph name="arrowRight" size={16} /></Link>
        </div>
      </section>

      <GuideSection id="faq" marker="?" title="Questions">
        {faq.map(f => <div key={f.q} className="price-faq"><h3>{f.q}</h3><p>{f.a}</p></div>)}
      </GuideSection>

      {siblings.length ? (
        <GuideSection id="more" marker="+" title={chip.category === "GPU" ? "Other graphics card prices" : "Other CPU prices"}>
          <ChipList chips={siblings.slice(0, 12)} label="Other prices" />
          <p><Link className="text-link" href="/price">All UAE PC part prices<Glyph name="arrowRight" size={16} /></Link></p>
        </GuideSection>
      ) : null}
    </GuideShell>
  )
}
