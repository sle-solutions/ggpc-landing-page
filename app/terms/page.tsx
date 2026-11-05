import type { Metadata } from "next"
import { DocPage } from "@/components/doc-page"
import { ORDER, sourcingFeePercent } from "@/lib/order/config"
import { formatAed } from "@/lib/order/format"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms | GG PC",
  description: "How GG PC build quotes, service fees, existing first 100 perks and retailer observations work.",
  alternates: { canonical: "/terms" },
}

export default function Terms() {
  return (
    <DocPage title="Terms" updated="6 November 2026">
      <p>GG PC supports UAE stores, prices in AED and UAE build services. Installation is worldwide. More countries coming soon. A parts plan or WhatsApp quote request does not commit you to buy anything. Online card checkout is not available yet.</p>
      <h2>First 100 perks</h2>
      <p>The existing first 100 waitlist members retain 10% off GG PC&apos;s build service and a free one to one consultation to help choose their parts. {ORDER.perkCopy} Places are counted by signup time. The discount is matched on the email you use at checkout, it works once per email, and there is no code to enter. Existing member benefits remain subject to their eligibility; no consultation booking is offered on this page.</p>
      <h2>The build service</h2>
      <p>A build link from the GG PC extension or web builder shows two service options. Review the parts and fees, then request a WhatsApp quote. The card-payment terms below describe the checkout flow when online payments become available; they do not mean checkout is currently enabled.</p>
      <ul>
        <li><strong>Build it for me.</strong> We buy the parts and build the PC. You pay the store prices at cost, plus a sourcing fee of {sourcingFeePercent}% of the parts, a build fee of {formatAed(ORDER.buildFeeFils)} and {formatAed(ORDER.protectionFeeFils)} buyer protection. Your card is held at checkout and we only charge it after we have bought the parts. If a store price is higher when we buy, we ask you before charging more, or we cancel the hold.</li>
        <li><strong>I buy, you build.</strong> You buy the parts yourself from the list, send them to our workshop, and pay the {formatAed(ORDER.buildFeeFils)} build fee plus {formatAed(ORDER.protectionFeeFils)} buyer protection.</li>
      </ul>
      <p>Buyer protection covers a QA check on every build (cable management, a 30 minute stress test, memory profile, BIOS version and photos of the inside) and a 2-year warranty on our labour. Parts keep the store and manufacturer warranty. The OG perk does not apply to buyer protection.</p>
      <p>Read the <Link href="/warranty">build QA and warranty details</Link>.</p>
      <p>Part prices come from our price data and show how old each price is. They can change before we buy. Some store links in the shopping list earn GG PC a small commission at no cost to you.</p>
      <h2>Who you are buying from</h2>
      <p>The seller is Lari Ventures LLC (GG PC). When card checkout is available, payments will be taken in AED and your card statement will show &quot;LARI VENTURES* {ORDER.statementDescriptorSuffix}&quot;.</p>
      <h2>Example prices and builds</h2>
      <p>Homepage parts artwork is illustrative, not a compatibility check of your PC. Builder and build pages use real retailer observations and show their age. Those observations are not guaranteed stock or final store prices. Confirm exact specifications, stock and prices before buying. Stores are not partners or sponsors of GG PC.</p>
      <h2>Changes</h2>
      <p>GG PC is still being built, so features and timing may change. If these terms change, we will update this page.</p>
      <h2>Contact</h2>
      <p>Questions? Ask us on <a href="https://discord.gg/HMd9ZkYHB3">Discord</a>.</p>
    </DocPage>
  )
}
