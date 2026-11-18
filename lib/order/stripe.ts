import Stripe from "stripe"
import { sheetConfigured } from "./sheet"

let client: Stripe | null = null
export function stripeConfigured(): boolean { return Boolean(process.env.STRIPE_SECRET_KEY) }
export function cardCheckoutConfigured(): boolean { return stripeConfigured() && Boolean(process.env.STRIPE_WEBHOOK_SECRET) && sheetConfigured() }
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return (client ??= new Stripe(key))
}
