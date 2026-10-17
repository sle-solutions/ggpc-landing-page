import type { Lane, RetailerId } from "./types"

// Server only: reads env at call time. Affiliate tagging is allowed ONLY in Lane B shopping lists;
// Lane A (we buy the parts) always gets the plain store URL. Render with rel="sponsored noopener".
export function amazonTagSet(): boolean { return Boolean(process.env.AMAZON_AE_ASSOCIATE_TAG) }

export function outboundUrl(retailer: RetailerId, url: string, lane: Lane = "B"): string | null {
  let parsed: URL
  try { parsed = new URL(url) } catch { return null }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null
  if (lane === "A") return parsed.toString()
  if (retailer === "amazon_ae") {
    const tag = process.env.AMAZON_AE_ASSOCIATE_TAG
    if (tag) parsed.searchParams.set("tag", tag)
    return parsed.toString()
  }
  if (retailer === "noon") {
    const template = process.env.NOON_LINK_TEMPLATE
    if (template && template.includes("{url}")) return template.replace("{url}", encodeURIComponent(parsed.toString()))
    return parsed.toString()
  }
  return parsed.toString()
}

export function noonCouponCode(): string | null { return process.env.NOON_COUPON_CODE?.trim() || null }

export function anyAffiliateActive(): boolean { return amazonTagSet() || Boolean(process.env.NOON_LINK_TEMPLATE) }
