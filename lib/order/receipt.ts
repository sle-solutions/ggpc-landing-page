import { decodeBuildCode } from "./build-code"
import { ORDER_ID_PATTERN } from "./order-row"
import type { SheetClient } from "./sheet"
export interface ReceiptStripe {
  checkout: { sessions: { retrieve(id: string): Promise<{ id: string; mode: string | null; status: string | null; currency: string | null; payment_status: string; payment_intent: string | { id: string } | null; metadata: Record<string, string> | null }> } }
  paymentIntents: { retrieve(id: string): Promise<{ id: string; status: string; metadata: Record<string, string> }> }
}
const pending = { confirmed: false as const, payment: null, showWorkshop: false }
// Read-only: return-page visits never attach, consume, repair or create an order.
export async function readOrderReceipt(input: { buildCode: string; lane: "A" | "B"; orderId?: string; sessionId?: string }, deps: { stripe: ReceiptStripe | null; sheet: SheetClient | null }) {
  if (!decodeBuildCode(input.buildCode).ok || !input.orderId || !ORDER_ID_PATTERN.test(input.orderId) || !input.sessionId || !/^cs_(test|live)_[A-Za-z0-9_]{1,240}$/.test(input.sessionId) || !deps.stripe || !deps.sheet?.receiptCheckout) return pending
  try {
    const session = await deps.stripe.checkout.sessions.retrieve(input.sessionId), m = session.metadata
    if (session.id !== input.sessionId || session.mode !== "payment" || session.status !== "complete" || session.currency !== "aed" || !m || m.order_id !== input.orderId || m.lane !== input.lane || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(m.checkout_intent) || !/^[a-f0-9]{64}$/.test(m.checkout_binding)) return pending
    const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id
    if (!piId || !/^pi_[A-Za-z0-9_]{1,240}$/.test(piId)) return pending
    const pi = await deps.stripe.paymentIntents.retrieve(piId)
    if (pi.id !== piId || ["order_id", "checkout_intent", "checkout_binding", "lane"].some(key => pi.metadata?.[key] !== m[key])) return pending
    const payment = pi.status === "succeeded" ? "paid" as const : pi.status === "requires_capture" && input.lane === "A" ? "authorized" as const : null
    if (!payment || input.lane === "B" && session.payment_status !== "paid") return pending
    const receipt = await deps.sheet.receiptCheckout({ orderId: input.orderId, intent: m.checkout_intent, binding: m.checkout_binding, session: session.id, paymentIntent: pi.id })
    if (receipt.ok !== true || receipt.protocol !== "ggpc-checkout-receipt-v1" || receipt.orderId !== input.orderId || receipt.intent !== m.checkout_intent || receipt.binding !== m.checkout_binding || receipt.session !== session.id || receipt.paymentIntent !== pi.id || receipt.buildCode !== input.buildCode || receipt.lane !== input.lane || receipt.status === "paid" && payment !== "paid" || input.lane === "B" && receipt.status !== "paid") return pending
    return { confirmed: true as const, payment, showWorkshop: input.lane === "B" && payment === "paid" }
  } catch { return pending }
}
