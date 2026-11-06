import { createHash, randomInt } from "node:crypto"
import { decodeBuildCode, toQuoteRequest } from "./build-code"
import { ORDER, pricedAddOns, siteUrl, stripeIntegrationId } from "./config"
import { fetchQuote, isQuote } from "./quote"
import type { QuoteResult } from "./quote"
import { computeTotals, laneStatus } from "./pricing"
import { checkoutRow, newOrderId, ORDER_ID_PATTERN } from "./order-row"
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
const INTENT = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Never trusts the browser for money: only {code, lane, addOnIds, email, intent} are read, everything else is re-quoted here.
export async function handleCheckout(request: Request, deps: CheckoutDeps): Promise<Response> {
  if (!deps.stripe || !deps.sheet) return json({ error: "checkout_unavailable" }, 503)
  let input: Record<string, unknown>
  try {
    input = await request.json()
    if (!input || typeof input !== "object" || Array.isArray(input)) return json({ error: "bad_request" }, 400)
  } catch { return json({ error: "bad_request" }, 400) }
  const intent = typeof input.intent === "string" ? input.intent : ""
  const code = typeof input.code === "string" ? input.code : ""
  const lane: Lane | null = input.lane === "A" || input.lane === "B" ? input.lane : null
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : ""
  const addOnIds = Array.isArray(input.addOnIds) ? [...new Set(input.addOnIds.filter((x): x is string => typeof x === "string").slice(0, 10))].sort() : []
  if (!INTENT.test(intent) || !lane || email.length > 254 || !EMAIL.test(email)) return json({ error: "bad_request" }, 400)
  const sellable = new Set(pricedAddOns().map(a => a.id))
  if (addOnIds.some(id => !sellable.has(id))) return json({ error: "bad_addon" }, 400)

  const decoded = decodeBuildCode(code)
  if (!decoded.ok) return json({ error: decoded.reason }, 400)
  const build = decoded.build

  const quote = await (deps.fetchQuote ?? fetchQuote)(toQuoteRequest(build))
  if (!isQuote(quote)) return json({ error: quote.error }, 502)
  const status = laneStatus(quote, build, lane)
  if (!status.ok) return json({ error: "lane_unavailable", reason: status.reason }, 409)

  const regular = computeTotals({ lane, quote, build, addOnIds, og: false })
  const discounted = computeTotals({ lane, quote, build, addOnIds, og: true })
  if ("error" in regular) return json({ error: regular.error }, 422)
  // Volatile observation ages/timestamps are not money or identity. The accepted
  // selection, prices, fees and exact provider parameters must remain the same.
  const selection = quote.parts.map(p => ({ slot: p.slot, status: p.status, chosen: p.chosen ? { retailer: p.chosen.retailer, retailerSku: p.chosen.retailerSku, title: p.chosen.title, url: p.chosen.url, price: p.chosen.price, status: p.chosen.status } : null }))
  const binding = createHash("sha256").update(JSON.stringify({ v: 1, email, code, lane, addOnIds, selection, regular: regular.lines, discounted: "error" in discounted ? null : discounted.lines, site: siteUrl() })).digest("hex")
  let orderId: string, og: boolean
  try {
    const candidate = newOrderId(deps.randomInt ?? randomInt), now = (deps.now ?? (() => new Date()))()
    const row = (totals: typeof regular, applied: boolean) => checkoutRow({ orderId: candidate, lane, email, buildName: build.name, code, quote, totals, og: applied, now })
    const reserved = await deps.sheet.reserveCheckout({ intent, binding, email, order: row(regular, false), ogOrder: "error" in discounted ? null : row(discounted, true) })
    if (!reserved.ok || !ORDER_ID_PATTERN.test(reserved.orderId) || typeof reserved.og !== "boolean" || reserved.og && "error" in discounted) throw new Error("invalid_reservation")
    orderId = reserved.orderId; og = reserved.og
  } catch (error) {
    if (error instanceof Error && error.message === "below_floor") return json({ error: "below_floor" }, 422)
    // A lost response may follow a durable hold. Never release or claim no charge.
    return json({ error: "sheet_unavailable" }, 502)
  }
  const totals = og ? discounted : regular
  if ("error" in totals) return json({ error: "below_floor" }, 422)

  const site = siteUrl()
  const metadata = { order_id: orderId, lane, og: og ? "true" : "false", checkout_intent: intent, checkout_binding: binding }
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
      success_url: `${site}/build/${code}/done?order=${orderId}&lane=${lane.toLowerCase()}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/build/${code}`,
    }, { idempotencyKey: `checkout_${orderId}` })
    if (!session.url) throw new Error("no session url")
    await deps.sheet.attachCheckout({ orderId, intent, binding, session: session.id })
    return json({ url: session.url })
  } catch {
    console.error("Checkout could not be confirmed")
    return json({ error: "checkout_failed" }, 502)
  }
}
