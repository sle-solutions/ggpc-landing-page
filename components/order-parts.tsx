import { amazonTagSet, noonCouponCode, outboundUrl, anyAffiliateActive } from "@/lib/order/affiliate"
import { ORDER } from "@/lib/order/config"
import { cleanTitle, formatAed, seenAgo } from "@/lib/order/format"
import { Glyph } from "@/components/pixel"
import { RETAILER_NAMES, SLOT_LABELS } from "@/lib/order/types"
import type { Build, Lane, QuotePart, QuoteResponse, SlotCode } from "@/lib/order/types"
import { isSkipped } from "@/lib/order/pricing"

export const REFRESH_HINT = "Open this build in the GG PC extension to refresh prices."

function partNote(part: QuotePart | undefined, store: string): string | null {
  if (!part) return null
  switch (part.status) {
    case "stale": return "This price is more than 7 days old."
    case "out_of_stock": return `Out of stock at ${store} when we last looked.`
    case "unpriced": return "We have no price on record for this part."
    case "unknown": return "This part is not in our price data yet."
    default: return null
  }
}

// Shows what the build code names. With no quote (price service down or not live yet) only slots and store SKUs show.
export function PartsList({ build, quote, lane }: { build: Build; quote: QuoteResponse | null; lane: Lane }) {
  const hideAmazonPrice = lane === "B" && amazonTagSet()
  const notes = build.parts.map((p, i) => {
    if (!quote || isSkipped(p.slot, p.candidates.length)) return null
    const c = quote.parts[i]?.chosen ?? null
    return partNote(quote.parts[i], c ? RETAILER_NAMES[c.retailer] : RETAILER_NAMES[p.candidates[0].retailer])
  })
  const anyNote = notes.some(Boolean)
  const rows = build.parts.map((p, i) => {
    const label = SLOT_LABELS[p.slot as SlotCode]
    if (isSkipped(p.slot, p.candidates.length)) {
      return <li key={i} className="order-part"><span className="order-slot">{label}</span><span className="order-title order-muted">Skipped. The CPU brings its own cooler.</span></li>
    }
    const part = quote?.parts[i]
    const c = part?.chosen ?? null
    const store = c ? RETAILER_NAMES[c.retailer] : RETAILER_NAMES[p.candidates[0].retailer]
    const note = notes[i]
    const showPrice = c !== null && c.price !== null && !(hideAmazonPrice && c.retailer === "amazon_ae")
    return (
      <li key={i} className="order-part">
        <span className="order-slot">{label}</span>
        <span className="order-title">{c?.title ? cleanTitle(c.title) : (quote ? "Part not in our price data" : `${store} item ${p.candidates[0].retailerSku}`)}</span>
        <span className="order-store">{store}</span>
        <span className="order-price">
          {hideAmazonPrice && c?.retailer === "amazon_ae" ? <span className="order-check">Check price on Amazon.ae</span> : showPrice ? <><strong>{formatAed(Math.round(c!.price! * 100))}</strong><small>{seenAgo(c!.ageSeconds)}</small></> : <small>No price yet</small>}
        </span>
        {note && <span className="order-note" role="note">{note}</span>}
        {lane === "A" && c?.url && outboundUrl(c.retailer, c.url, "A") && <a className="order-link" href={outboundUrl(c.retailer, c.url, "A")!} target="_blank" rel="noopener noreferrer">View at {store}<Glyph name="arrowUpRight" size={12} /><span className="sr-only"> (opens in a new tab)</span></a>}
      </li>
    )
  })
  return (
    <>
      <ul className="order-list">{rows}</ul>
      {anyNote && <p className="order-hint">{REFRESH_HINT}</p>}
    </>
  )
}

// Lane B: the shopper buys, so every row links out. Affiliate tags exist only here.
// showAddress is true only on the done page after Stripe confirms payment: the workshop is a private address.
export function ShoppingList({ build, quote, orderId, showAddress = false }: { build: Build; quote: QuoteResponse; orderId?: string; showAddress?: boolean }) {
  const coupon = noonCouponCode()
  const hideAmazonPrice = amazonTagSet()
  const hasNoon = quote.parts.some(p => p.chosen?.retailer === "noon")
  const workshop = ORDER.workshopAddress
  return (
    <section className="order-shopping frame" aria-labelledby="shopping-title">
      <h2 id="shopping-title" className="order-h2">Your shopping list</h2>
      <ol className="order-list">
        {build.parts.map((p, i) => {
          const c = quote.parts[i]?.chosen
          if (isSkipped(p.slot, p.candidates.length) || !c) return null
          const href = c.url ? outboundUrl(c.retailer, c.url, "B") : null
          const amazonHidden = hideAmazonPrice && c.retailer === "amazon_ae"
          return (
            <li key={i} className="order-part">
              <span className="order-slot">{SLOT_LABELS[p.slot as SlotCode]}</span>
              <span className="order-title">{c.title ? cleanTitle(c.title) : c.retailerSku}</span>
              <span className="order-store">{RETAILER_NAMES[c.retailer]}</span>
              <span className="order-price">{amazonHidden ? <span className="order-check">Check price on Amazon.ae</span> : c.price !== null ? <><strong>{formatAed(Math.round(c.price * 100))}</strong><small>{seenAgo(c.ageSeconds)}</small></> : <small>No price yet</small>}</span>
              {href && <a className="order-link" href={href} target="_blank" rel="sponsored noopener noreferrer">Open at {RETAILER_NAMES[c.retailer]}<Glyph name="arrowUpRight" size={12} /><span className="sr-only"> (opens in a new tab)</span></a>}
            </li>
          )
        })}
      </ol>
      {coupon && hasNoon && <p className="order-hint">noon coupon code: <strong>{coupon}</strong></p>}
      {workshop && !showAddress && <p className="order-hint">You get the workshop delivery address right after you pay the build fee.</p>}
      {workshop && showAddress && (
        <div className="order-address">
          <h3 className="order-h3">Deliver the parts to</h3>
          <address>{workshop.name}<br />{workshop.lines.map((l, i) => <span key={i}>{l}<br /></span>)}{workshop.phone}</address>
        </div>
      )}
      <p className="order-hint">{orderId ? <>Put your order ID <strong>{orderId}</strong> in the delivery name.</> : "After checkout you get an order ID. Put it in the delivery name."}</p>
      <p className="order-hint">Prices are the last ones we saw and can change. Check the total at the store before you pay.</p>
      {anyAffiliateActive() && <p className="order-disclosure">Some store links earn GG PC a small commission at no cost to you.</p>}
    </section>
  )
}
