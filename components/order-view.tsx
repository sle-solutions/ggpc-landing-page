import { ORDER, PROTECTION_FEE_LABEL, SOURCING_FEE_LABEL, pricedAddOns } from "@/lib/order/config"
import { formatAed } from "@/lib/order/format"
import type { Build, Lane, QuoteResponse } from "@/lib/order/types"
import { computeTotals, laneStatus } from "@/lib/order/pricing"
import type { LaneFailure } from "@/lib/order/pricing"
import { OrderPanel } from "@/components/order-checkout"
import { PartsList, REFRESH_HINT } from "@/components/order-parts"

const REASONS: Record<LaneFailure, string> = {
  parts_not_ok: `Some parts have an old price or are out of stock. ${REFRESH_HINT}`,
  unknown_parts: `Some parts are not in our price data yet. ${REFRESH_HINT}`,
  incomplete: "This build is missing a core part. We need a CPU, motherboard, RAM, storage, power supply, case and GPU.",
  no_workshop: "Drop-off opens soon. Choose Build it for me for now.",
}

export function LaneSwitch({ code, lane }: { code: string; lane: Lane }) {
  return (
    <nav className="order-lanes" aria-label="Order type">
      <a href={`/build/${code}`} aria-current={lane === "A" ? "page" : undefined}>
        <strong>Build it for me</strong>
        <span>We buy every part and build your PC. One payment, nothing to order yourself.</span>
      </a>
      <a href={`/build/${code}?lane=b`} aria-current={lane === "B" ? "page" : undefined}>
        <strong>I buy, you build</strong>
        <span>You order the parts from the stores and send them to us. You pay us only to build it: {formatAed(ORDER.buildFeeFils + ORDER.protectionFeeFils)}.</span>
      </a>
    </nav>
  )
}

export function OrderBody({ code, build, quote, lane, enabled }: { code: string; build: Build; quote: QuoteResponse | null; lane: Lane; enabled: boolean }) {
  const status = quote ? laneStatus(quote, build, lane) : null
  const totals = quote && status?.ok ? computeTotals({ lane, quote, build, addOnIds: [], og: false }) : null
  const lines: Array<{ label: string; fils: number }> = []
  if (totals && !("error" in totals)) {
    if (lane === "A") lines.push({ label: "Parts at store prices", fils: totals.partsFils }, { label: SOURCING_FEE_LABEL, fils: totals.sourcingFils })
    lines.push({ label: "Build fee", fils: totals.buildFils }, { label: PROTECTION_FEE_LABEL, fils: totals.protectionFils })
  }
  const blockedReason = !quote ? "We cannot show a total until prices load." : status && !status.ok ? REASONS[status.reason] : totals && "error" in totals ? "This order is below our minimum build fee." : null
  const holdCopy = lane === "A" ? "We place a hold on your card. We buy your parts, then charge. We confirm every price first." : "You buy the parts yourself and send them to our workshop. You pay GG PC only the build fee and buyer protection."
  return (
    <div className="order-grid">
      <section className="order-parts frame" aria-labelledby="parts-title">
        <h2 id="parts-title" className="order-h2">Parts in this build</h2>
        <PartsList build={build} quote={quote} lane={lane} />
      </section>
      <OrderPanel code={code} lane={lane} lines={lines} addOns={pricedAddOns()} enabled={enabled} blockedReason={blockedReason} perkCopy={ORDER.perkCopy} holdCopy={holdCopy} />
    </div>
  )
}
