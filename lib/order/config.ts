// Single source of numbers for "Order this build". Money is integer fils (1 AED = 100 fils).
// Shared contract with the extension: see ../CLAUDE.md "Order links" and the build code format in lib/order/build-code.ts.
export const ORDER = {
  currency: "aed",
  sourcingFeeRate: 0.1,
  buildFeeFils: 42500,
  labourFloorFils: 15000,
  // Estimated Stripe cost per charge (US account, UAE cards, AED): 2.9% base + 1.5% international card + 1% currency conversion = 5.4%,
  // plus USD 0.30 fixed, modelled as AED 1.10. Internal only: never shown to customers and never a Stripe line item.
  stripeFeeRate: 0.054,
  stripeFeeFixedFils: 110,
  // Card statements read "<account descriptor prefix>* GGPC", e.g. "LARI VENTURES* GGPC" (set the prefix in the Stripe Dashboard).
  statementDescriptorSuffix: "GGPC",
  ogDiscountRate: 0.1,
  ogSlots: 100,
  maxPriceAgeSeconds: 604800,
  laneACaptureMethod: "manual" as const,
  // Add-on prices in fils (AED x 100). null keeps an add-on hidden and unsellable. Set 2026-10-17.
  addOns: [
    { id: "delivery_uae", name: "Delivery in the UAE", priceFils: 7500 },
    { id: "windows_setup", name: "Windows setup and drivers (licence not included)", priceFils: 7500 },
  ] as ReadonlyArray<{ id: string; name: string; priceFils: number | null }>,
  // TODO founder: set the workshop drop-off address. Lane B stays disabled until this is set.
  workshopAddress: null as null | { name: string; lines: string[]; phone: string },
  perkCopy: "OG perk: 10% off GG PC's build service (sourcing fee and build fee). Store part prices are passed through at cost.",
  // TODO founder: add a refunds line to the terms once the policy is decided (kept out of rendered copy until then).
} as const

// Tags every Checkout Session this integration creates (Stripe integration_identifier). Fixed, not per request.
export const stripeIntegrationId = "ggpc_build_order_kqwmzrta"

export const sourcingFeePercent = Math.round(ORDER.sourcingFeeRate * 100)
export const SOURCING_FEE_LABEL = `Sourcing fee (${sourcingFeePercent}% of parts)`

export function pricedAddOns() {
  return ORDER.addOns.filter((a): a is { id: string; name: string; priceFils: number } => a.priceFils !== null && a.priceFils > 0)
}

export const SITE_URL_DEFAULT = "https://www.ggpc.app"
export function siteUrl() {
  return (process.env.SITE_URL || SITE_URL_DEFAULT).replace(/\/+$/, "")
}
