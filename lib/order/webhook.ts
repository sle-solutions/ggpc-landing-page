import type Stripe from "stripe"
import type { OrderRow, SheetClient } from "./sheet"
import { ORDER_ID_PATTERN } from "./order-row"

export interface WebhookStripe { paymentIntents: { retrieve(id: string): Promise<{ id: string; status: string; metadata?: Record<string, string> | null }> } }

type Addr = { line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; postal_code?: string | null; country?: string | null } | null | undefined
const addressText = (a: Addr) => a ? [a.line1, a.line2, a.city, a.state, a.postal_code, a.country].filter(Boolean).join(", ") : ""
const idOf = (x: string | { id: string } | null | undefined) => typeof x === "string" ? x : x?.id

// Customer fields from a Checkout Session. Shipping details win for name and address (that is where the PC goes).
export function customerFields(session: Stripe.Checkout.Session): Partial<OrderRow> {
  const loose = session as unknown as { collected_information?: { shipping_details?: { name?: string | null; address?: Addr } | null } | null; shipping_details?: { name?: string | null; address?: Addr } | null }
  const shipping = loose.collected_information?.shipping_details ?? loose.shipping_details ?? null
  const details = session.customer_details
  const out: Partial<OrderRow> = {}
  const name = shipping?.name || details?.name
  const email = details?.email || session.customer_email
  const phone = details?.phone
  const address = addressText(shipping?.address) || addressText(details?.address)
  if (name) out.name = name
  if (email) out.email = email.toLowerCase()
  if (phone) out.phone = phone
  if (address) out.address = address
  return out
}

// The selected merchant can host other products. Unclaimed/foreign events are
// not authority to create a GG PC row, and need no provider/Sheet work.
function managedMetadata(value: unknown): { order_id: string; checkout_intent: string; checkout_binding: string } | null {
  if (!value || typeof value !== "object") return null
  const m = value as Record<string, unknown>
  if (typeof m.order_id !== "string" || !ORDER_ID_PATTERN.test(m.order_id) || !m.checkout_intent && !m.checkout_binding) return null
  if (typeof m.checkout_intent !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(m.checkout_intent) || typeof m.checkout_binding !== "string" || !/^[a-f0-9]{64}$/.test(m.checkout_binding)) throw new Error("claim_event_invalid")
  return m as { order_id: string; checkout_intent: string; checkout_binding: string }
}
// Returns the row to write, or null when the event needs no sheet change (caller answers 200).
export async function rowForEvent(event: Stripe.Event, stripe: WebhookStripe): Promise<OrderRow | null> {
  if (!managedMetadata((event.data.object as { metadata?: unknown }).metadata)) return null
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session.metadata?.order_id
      const piId = idOf(session.payment_intent as string | { id: string } | null)
      if (!orderId || !piId) return null
      const intent = await stripe.paymentIntents.retrieve(piId)
      if (intent.id !== piId) throw new Error("claim_event_invalid")
      if (session.metadata?.checkout_intent || session.metadata?.checkout_binding) {
        for (const key of ["order_id", "checkout_intent", "checkout_binding"]) if (!session.metadata?.[key] || intent.metadata?.[key] !== session.metadata[key]) throw new Error("claim_event_invalid")
      }
      const status = intent.status === "requires_capture" ? "authorized" : intent.status === "succeeded" ? "paid" : null
      if (!status) return null // still processing; a later event will carry the final state
      return { order_id: orderId, status, stripe_session: session.id, payment_intent: piId, ...customerFields(session) }
    }
    case "payment_intent.succeeded":
    case "payment_intent.canceled": {
      const intent = event.data.object as Stripe.PaymentIntent
      const orderId = intent.metadata?.order_id
      if (!orderId) return null
      return { order_id: orderId, status: event.type === "payment_intent.succeeded" ? "paid" : "canceled", payment_intent: intent.id }
    }
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session.metadata?.order_id
      if (!orderId) return null
      return { order_id: orderId, status: event.type === "checkout.session.expired" ? "expired" : "canceled", stripe_session: session.id }
    }
    default:
      return null
  }
}

export async function handleEvent(event: Stripe.Event, deps: { stripe: WebhookStripe; sheet: SheetClient }): Promise<void> {
  const row = await rowForEvent(event, deps.stripe)
  if (!row) return
  const m = managedMetadata((event.data.object as { metadata?: unknown }).metadata)
  if (!m || !event.id) throw new Error("claim_event_invalid")
  await deps.sheet.transitionCheckout({ orderId: row.order_id, intent: m.checkout_intent, binding: m.checkout_binding, eventId: event.id, order: row })
}
