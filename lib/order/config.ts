// Single source of numbers for "Order this build". Money is integer fils (1 AED = 100 fils).
// Shared contract with the extension: see ../CLAUDE.md "Order links" and the build code format in lib/order/build-code.ts.
export const ORDER = {
  currency: "aed",
  sourcingFeeRate: 0.08,
  buildFeeFils: 39900,
  labourFloorFils: 15000,
  ogDiscountRate: 0.1,
  ogSlots: 100,
  maxPriceAgeSeconds: 604800,
  laneACaptureMethod: "manual" as const,
  // TODO founder: set priceFils for each add-on. null keeps it hidden and unsellable.
  addOns: [
    { id: "delivery_uae", name: "Delivery in the UAE", priceFils: null },
    { id: "windows_setup", name: "Windows setup and drivers (licence not included)", priceFils: null },
  ] as ReadonlyArray<{ id: string; name: string; priceFils: number | null }>,
  // TODO founder: set the workshop drop-off address. Lane B stays disabled until this is set.
  workshopAddress: null as null | { name: string; lines: string[]; phone: string },
  perkCopy: "OG perk: 10% off GG PC's build service (sourcing fee and build fee). Store part prices are passed through at cost.",
  // TODO founder: add a refunds line to the terms once the policy is decided (kept out of rendered copy until then).
} as const

export function pricedAddOns() {
  return ORDER.addOns.filter((a): a is { id: string; name: string; priceFils: number } => a.priceFils !== null && a.priceFils > 0)
}

export const SITE_URL_DEFAULT = "https://www.ggpc.app"
export function siteUrl() {
  return (process.env.SITE_URL || SITE_URL_DEFAULT).replace(/\/+$/, "")
}
