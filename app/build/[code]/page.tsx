import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { LaneSwitch, OrderBody } from "@/components/order-view"
import { ShoppingList } from "@/components/order-parts"
import { decodeBuildCode, toQuoteRequest } from "@/lib/order/build-code"
import { fetchQuote, isQuote } from "@/lib/order/quote"
import { laneStatus } from "@/lib/order/pricing"
import { sheetConfigured } from "@/lib/order/sheet"
import { stripeConfigured } from "@/lib/order/stripe"
import type { Lane } from "@/lib/order/types"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Order this build | GG PC", robots: { index: false, follow: false } }

export default async function BuildPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ lane?: string | string[] }> }) {
  // Next has already decoded route params. Validate the build code directly so
  // malformed percent escapes reach the recovery screen instead of throwing.
  const { code } = await params
  const sp = await searchParams
  const lane: Lane = sp.lane === "b" ? "B" : "A"
  const decoded = decodeBuildCode(code)

  if (!decoded.ok) {
    return (
      <Shell>
        <section className="order-error frame" role="alert">
          <h1 className="order-h1">{decoded.reason === "new_version" ? "Update the extension" : "This build link does not work"}</h1>
          <p>{decoded.reason === "new_version" ? "This link was made by a newer version of GG PC. Please update the extension and share the link again." : "We could not read this build code. Open your build in the GG PC extension and press Order this build again."}</p>
        </section>
      </Shell>
    )
  }
  const build = decoded.build
  const result = await fetchQuote(toQuoteRequest(build))
  const quote = isQuote(result) ? result : null
  const enabled = stripeConfigured() && sheetConfigured()
  const laneBOk = quote && lane === "B" && laneStatus(quote, build, "B").ok

  return (
    <Shell>
      <header className="order-head">
        <h1 className="order-h1">{build.name || "Your build"}</h1>
        <p>Have GG PC build it, or buy the parts yourself and we assemble and test them. Prices below come from our price data, not from the link.</p>
      </header>
      <LaneSwitch code={code} lane={lane} enabled={enabled} />
      {!quote && (
        <p className="order-note order-banner" role="status">We cannot check prices right now. Try again later.</p>
      )}
      <OrderBody code={code} build={build} quote={quote} lane={lane} enabled={enabled} />
      {laneBOk && quote && <ShoppingList build={build} quote={quote} checkoutEnabled={enabled} />}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main-content" className="order">
        <div className="page-width order-wrap">{children}</div>
      </main>
      <Footer />
    </>
  )
}
