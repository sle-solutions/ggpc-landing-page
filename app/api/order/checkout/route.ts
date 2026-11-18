import { handleCheckout } from "@/lib/order/checkout"
import type { StripeLike } from "@/lib/order/checkout"
import { sheet, sheetConfigured } from "@/lib/order/sheet"
import { cardCheckoutConfigured, getStripe } from "@/lib/order/stripe"

// Cold Apps Script calls (OG check, order snapshot) can take 10s+.
export const maxDuration = 60
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (!cardCheckoutConfigured()) return Response.json({ error: "checkout_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } })
  return handleCheckout(request, { stripe: getStripe() as unknown as StripeLike | null, sheet: sheetConfigured() ? sheet : null })
}
