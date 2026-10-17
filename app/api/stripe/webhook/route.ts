import { sheet, sheetConfigured } from "@/lib/order/sheet"
import { getStripe } from "@/lib/order/stripe"
import { handleEvent } from "@/lib/order/webhook"

export const maxDuration = 60
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret || !sheetConfigured()) return Response.json({ error: "not_configured" }, { status: 503 })
  const body = await request.text() // raw body: the signature covers the exact bytes
  const signature = request.headers.get("stripe-signature")
  if (!signature) return Response.json({ error: "invalid_signature" }, { status: 400 })
  let event
  try { event = stripe.webhooks.constructEvent(body, signature, secret) } catch { return Response.json({ error: "invalid_signature" }, { status: 400 }) }
  try {
    await handleEvent(event, { stripe, sheet })
    return Response.json({ received: true })
  } catch (error) {
    // 500 so Stripe retries (up to 3 days) until the sheet write succeeds.
    console.error("Stripe webhook sheet write failed:", error)
    return Response.json({ error: "sheet_write_failed" }, { status: 500 })
  }
}
