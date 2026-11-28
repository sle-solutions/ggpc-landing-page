import Link from "next/link"
import { RetailerMark } from "@/components/retailer-brand"
import { Glyph } from "@/components/pixel"
import { formatAed, seenAgo } from "@/lib/order/format"
import { RETAILER_NAMES } from "@/lib/order/types"
import { chipPath, type ChipSummary, type DailyLow, type Offer, type Verdict } from "@/lib/prices/catalog"

export const aed = (amount: number) => formatAed(Math.round(amount * 100))

export function shortDate(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
}

export function ageOf(offer: Offer, now: number): string {
  return seenAgo(Math.max(0, Math.floor((now - Date.parse(offer.lastChecked)) / 1000)))
}

export function verdictText(v: Verdict, today: number): { tag: string; line: string; tone: "good" | "warn" | "new" } {
  if (v.kind === "at_low") return { tag: "At its low", tone: "good", line: `${aed(today)} is the lowest in-stock price we have seen since we started tracking on ${shortDate(v.since)}.` }
  if (v.kind === "above_low") return { tag: "Above its low", tone: "warn", line: `${aed(today)} is ${aed(v.above)} above the lowest we have seen (${aed(v.low.price)} on ${shortDate(v.low.day)}). Tracking since ${shortDate(v.since)}.` }
  return { tag: "New tracker", tone: "new", line: v.since ? `We started tracking this on ${shortDate(v.since)}. A buy or wait call shows up after a week of prices.` : "We just started tracking this. A buy or wait call shows up after a week of prices." }
}

// Server-rendered stepped line of the cheapest in-stock price per day. No client JS.
export function PriceChart({ days, name }: { days: DailyLow[]; name: string }) {
  if (days.length < 2) return <p className="price-chart-empty">Not enough history for a chart yet. Check back in a few days.</p>
  const W = 640, H = 200, padL = 8, padR = 8, padT = 16, padB = 16
  const prices = days.map(d => d.price)
  const min = Math.min(...prices), max = Math.max(...prices)
  const span = Math.max(max - min, max * 0.04)
  const lo = min - span * 0.15, hi = max + span * 0.15
  const t0 = Date.parse(`${days[0].day}T00:00:00Z`), t1 = Date.parse(`${days[days.length - 1].day}T00:00:00Z`)
  const x = (day: string) => padL + ((Date.parse(`${day}T00:00:00Z`) - t0) / Math.max(1, t1 - t0)) * (W - padL - padR)
  const y = (p: number) => padT + (1 - (p - lo) / (hi - lo)) * (H - padT - padB)
  let d = `M${x(days[0].day).toFixed(1)},${y(days[0].price).toFixed(1)}`
  for (let i = 1; i < days.length; i++) d += ` H${x(days[i].day).toFixed(1)} V${y(days[i].price).toFixed(1)}`
  const lowY = y(min)
  const label = `Cheapest in-stock ${name} price per day from ${shortDate(days[0].day)} to ${shortDate(days[days.length - 1].day)}: low ${aed(min)}, high ${aed(max)}, latest ${aed(prices[prices.length - 1])}.`
  return (
    <figure className="price-chart frame">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} shapeRendering="crispEdges" preserveAspectRatio="none">
        <line x1={padL} x2={W - padR} y1={lowY} y2={lowY} className="price-chart-low" />
        <path d={d} className="price-chart-line" />
        {days.map(p => <rect key={p.day} x={x(p.day) - 3} y={y(p.price) - 3} width={6} height={6} className="price-chart-dot" />)}
      </svg>
      <div className="price-chart-axis" aria-hidden="true"><span>{shortDate(days[0].day)}</span><span>{shortDate(days[days.length - 1].day)}</span></div>
      <figcaption><span><i className="price-key-line" aria-hidden="true" />Cheapest card that day</span><span><i className="price-key-low" aria-hidden="true" />Low {aed(min)}</span><span>High {aed(max)}</span></figcaption>
    </figure>
  )
}

export function OfferTable({ offers, now }: { offers: Offer[]; now: number }) {
  return (
    <div className="price-offers frame">
      <table>
        <caption className="sr-only">UAE store offers, cheapest in-stock first</caption>
        <thead><tr><th scope="col">Product</th><th scope="col">Store</th><th scope="col">Price</th><th scope="col"><span className="sr-only">Link</span></th></tr></thead>
        <tbody>
          {offers.map((o, i) => (
            <tr key={`${o.componentId}:${o.retailer}`} className={i === 0 && o.inStock ? "is-best" : undefined}>
              <td className="price-offer-name">{o.name}<span className="price-offer-meta">{o.inStock ? ageOf(o, now) : "Out of stock"}</span></td>
              <td className="price-offer-store"><RetailerMark retailer={o.retailer} /><span>{RETAILER_NAMES[o.retailer]}</span></td>
              <td className="price-offer-price">{aed(o.price)}</td>
              <td><a className="text-link" href={o.url} target="_blank" rel="nofollow noopener noreferrer" aria-label={`View ${o.name} at ${RETAILER_NAMES[o.retailer]}`}>View<Glyph name="arrowUpRight" size={16} /></a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const unit = (category: ChipSummary["category"], n: number) => category === "GPU" ? (n === 1 ? "card" : "cards") : (n === 1 ? "version" : "versions")

export function ChipList({ chips, label }: { chips: ChipSummary[]; label: string }) {
  return (
    <ul className="price-chip-list" aria-label={label}>
      {chips.map(c => (
        <li key={c.slug}>
          <Link className="price-chip frame" href={chipPath(c.slug)}>
            <span className="price-chip-name">{c.name}</span>
            <span className="price-chip-price">{aed(c.cheapest.price)}</span>
            <span className="price-chip-meta">at {RETAILER_NAMES[c.cheapest.retailer]} <span aria-hidden="true">/</span> {c.cards} {unit(c.category, c.cards)}, {c.stores} {c.stores === 1 ? "store" : "stores"}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
