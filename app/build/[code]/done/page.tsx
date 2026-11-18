import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ShoppingList } from "@/components/order-parts"
import { decodeBuildCode, toQuoteRequest } from "@/lib/order/build-code"
import { ORDER_ID_PATTERN } from "@/lib/order/order-row"
import { fetchQuote, isQuote } from "@/lib/order/quote"
import { laneStatus } from "@/lib/order/pricing"
import { getStripe } from "@/lib/order/stripe"
import { sheet, sheetConfigured } from "@/lib/order/sheet"
import { readOrderReceipt, type ReceiptStripe } from "@/lib/order/receipt"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Order confirmation | GG PC", robots: { index: false, follow: false }, referrer: "no-referrer" }

export default async function Done({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ order?: string; lane?: string; session_id?: string }> }) {
  const { code } = await params
  const { order, lane, session_id } = await searchParams
  const orderId = typeof order === "string" && ORDER_ID_PATTERN.test(order) ? order : null
  const laneB = lane === "b"
  const decoded = decodeBuildCode(code)
  const receipt = await readOrderReceipt({ buildCode: code, lane: laneB ? "B" : "A", orderId: orderId ?? undefined, sessionId: session_id }, { stripe: getStripe() as unknown as ReceiptStripe | null, sheet: sheetConfigured() ? sheet : null })
  let list = null
  if (laneB && decoded.ok) {
    const quote = await fetchQuote(toQuoteRequest(decoded.build))
    if (isQuote(quote) && laneStatus(quote, decoded.build, "B").ok) list = <ShoppingList build={decoded.build} quote={quote} orderId={receipt.confirmed ? orderId ?? undefined : undefined} showAddress={receipt.showWorkshop} />
  }
  return (
    <>
      <Navbar />
      <main id="main-content" className="order">
        <div className="page-width order-wrap">
          <section className="order-error frame">
            <h1 className="order-h1">{receipt.confirmed ? `Order ${orderId} confirmed` : "Checking your order"}</h1>
            {receipt.confirmed ? <><p>{laneB ? "Your payment is confirmed. Buy the parts from the list below and send them to our workshop. We start the build when they arrive." : receipt.payment === "authorized" ? "Your card is authorized. We buy your parts before capturing the payment. If a store price changes, we ask you before charging more." : "Your payment is confirmed. We will contact you about your build."}</p><p>We will contact you at the email you used at checkout.</p></> : <p role="status">We could not confirm this order yet. Payment may still be processing. Retry this same page, or contact GG PC before starting another order.</p>}
          </section>
          {list}
        </div>
      </main>
      <Footer />
    </>
  )
}
