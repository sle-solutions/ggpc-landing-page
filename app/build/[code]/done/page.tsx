import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ShoppingList } from "@/components/order-parts"
import { decodeBuildCode, toQuoteRequest } from "@/lib/order/build-code"
import { ORDER_ID_PATTERN } from "@/lib/order/order-row"
import { fetchQuote, isQuote } from "@/lib/order/quote"
import { laneStatus } from "@/lib/order/pricing"
import { getStripe } from "@/lib/order/stripe"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Order received | GG PC", robots: { index: false, follow: false } }

export default async function Done({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ order?: string; lane?: string; session_id?: string }> }) {
  const { code: raw } = await params
  const code = decodeURIComponent(raw)
  const { order, lane, session_id } = await searchParams
  const orderId = typeof order === "string" && ORDER_ID_PATTERN.test(order) ? order : null
  const laneB = lane === "b"
  const decoded = decodeBuildCode(code)
  let list = null
  if (laneB && decoded.ok) {
    const quote = await fetchQuote(toQuoteRequest(decoded.build))
    const paid = orderId ? await paidLaneBOrder(session_id, orderId) : false
    if (isQuote(quote) && laneStatus(quote, decoded.build, "B").ok) list = <ShoppingList build={decoded.build} quote={quote} orderId={orderId ?? undefined} showAddress={paid} />
  }
  return (
    <>
      <Navbar />
      <main id="main-content" className="order">
        <div className="page-width order-wrap">
          <section className="order-error frame">
            <h1 className="order-h1">{orderId ? `Order ${orderId} received` : "Order received"}</h1>
            <p>{laneB ? "Buy the parts from the list below and send them to our workshop. We start the build when they arrive." : "We hold the payment, buy your parts, then charge. If a store price is higher when we buy, we ask you before charging more."}</p>
            <p>We will contact you at the email you used at checkout.</p>
          </section>
          {list}
        </div>
      </main>
      <Footer />
    </>
  )
}

// The workshop address is private: reveal it only for a paid Lane B Checkout Session that matches this order.
async function paidLaneBOrder(sessionId: string | undefined, orderId: string): Promise<boolean> {
  const stripe = getStripe()
  if (!stripe || typeof sessionId !== "string" || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return false
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    return session.payment_status === "paid" && session.metadata?.order_id === orderId && session.metadata?.lane === "B"
  } catch {
    return false
  }
}
