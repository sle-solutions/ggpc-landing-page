import { randomInt } from "node:crypto"
import { decodeBuildCode, toQuoteRequest } from "./build-code"
import { ORDER, pricedAddOns, siteUrl, stripeIntegrationId } from "./config"
import { fetchQuote, isQuote } from "./quote"
import type { QuoteResult } from "./quote"
import { computeTotals, laneStatus } from "./pricing"
import { checkoutRow, newOrderId } from "./order-row"
import type { SheetClient } from "./sheet"
import type { Lane } from "./types"

// Minimal slice of the Stripe client that checkout needs, so tests can inject a fake.
export interface StripeLike { checkout: { sessions: { create(params: Record<string, unknown>, options?: { idempotencyKey?: string }): Promise<{ id: string; url: string | null }> } } }
export interface CheckoutDeps {
  stripe: StripeLike | null
  sheet: SheetClient | null
  fetchQuote?: (req: ReturnType<typeof toQuoteRequest>) => Promise<QuoteResult>
  randomInt?: (max: number) => number
  now?: () => Date
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } })
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Never trusts the browser for money: only {code, lane, addOnIds, email} are read, everything else is re-quoted here.
export async function handleCheckout(request: Request, deps: CheckoutDeps): Promise<Response> {
  if (!deps.stripe || !deps.sheet) return json({ error: "checkout_unavailable" }, 503)
  let input: Record<string, unknown>
  try { input = await request.json() } catch { return json({ error: "bad_request" }, 400) }
  const code = typeof input.code === "string" ? input.code : ""
  const lane: Lane | null = input.lane === "A" || input.lane === "B" ? input.lane : null
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : ""
  const addOnIds = Array.isArray(input.addOnIds) ? input.addOnIds.filter((x): x is string => typeof x === "string").slice(0, 10) : []
  if (!lane || email.length > 254 || !EMAIL.test(email)) return json({ error: "bad_request" }, 400)
  const sellable = new Set(pricedAddOns().map(a => a.id))
  if (addOnIds.some(id => !sellable.has(id))) return json({ error: "bad_addon" }, 400)

  const decoded = decodeBuildCode(code)
  if (!decoded.ok) return json({ error: decoded.reason }, 400)
  const build = decoded.build

  const quote = await (deps.fetchQuote ?? fetchQuote)(toQuoteRequest(build))
  if (!isQuote(quote)) return json({ error: quote.error }, 502)
  const status = laneStatus(quote, build, lane)
  if (!status.ok) return json({ error: "lane_unavailable", reason: status.reason }, 409)

  let og = false
  try {
    const check = await deps.sheet.ogCheck(email)
    og = check.eligible
  } catch (error) {
    console.error("OG check failed:", error)
    return json({ error: "sheet_unavailable" }, 502)
  }
  const totals = computeTotals({ lane, quote, build, addOnIds, og })
  if ("error" in totals) return json({ error: totals.error }, 422)

  const orderId = newOrderId(deps.randomInt ?? randomInt)
  try {
    await deps.sheet.upsertOrder(checkoutRow({ orderId, lane, email, buildName: build.name, code, quote, totals, og, now: (deps.now ?? (() => new Date()))() }))
  } catch (error) {
    console.error("Order snapshot failed:", error)
    return json({ error: "sheet_unavailable" }, 502)
  }

  const site = siteUrl()
  const metadata = { order_id: orderId, lane, og: og ? "true" : "false" }
  try {
    const session = await deps.stripe.checkout.sessions.create({
      mode: "payment",
      integration_identifier: stripeIntegrationId,
      // New Stripe accounts default to Managed Payments (merchant of record, digital goods), which rejects statement_descriptor_suffix. We sell and ship physical PCs, so opt out per request.
      managed_payments: { enabled: false },
      customer_email: email,
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: ["AE"] },
      line_items: totals.lines.map(line => ({
        quantity: 1,
        price_data: { currency: ORDER.currency, unit_amount: line.amountFils, product_data: { name: line.name.slice(0, 250), ...(line.description ? { description: line.description } : {}) } },
      })),
      metadata,
      payment_intent_data: { metadata, statement_descriptor_suffix: ORDER.statementDescriptorSuffix, ...(lane === "A" ? { capture_method: ORDER.laneACaptureMethod } : {}) },
      success_url: `${site}/build/${code}/done?order=${orderId}&lane=${lane.toLowerCase()}`,
      cancel_url: `${site}/build/${code}`,
    }, { idempotencyKey: `checkout_${orderId}` })
    if (!session.url) throw new Error("no session url")
    return json({ url: session.url })
  } catch (error) {
    console.error("Stripe session failed:", error)
    return json({ error: "checkout_failed" }, 502)
  }
}
