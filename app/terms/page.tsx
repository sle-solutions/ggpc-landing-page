import type { Metadata } from "next"
import { DocPage } from "@/components/doc-page"
import { ORDER, sourcingFeePercent } from "@/lib/order/config"
import { formatAed } from "@/lib/order/format"

export const metadata: Metadata = {
  title: "Terms | GG PC",
  description: "How the GG PC waitlist, the first 100 perks and the build service work, and what the example prices on the site mean.",
  alternates: { canonical: "/terms" },
}

export default function Terms() {
  return (
    <DocPage title="Terms" updated="17 October 2026">
      <p>GG PC is in development. Joining the waitlist is free and does not commit you to buy anything.</p>
      <h2>First 100 perks</h2>
      <p>The first 100 people to join the waitlist get 10% off GG PC&apos;s build service and a free one to one consultation to help choose their parts. {ORDER.perkCopy} Places are counted by signup time. The discount is matched on the email you use at checkout, it works once per email, and there is no code to enter. We will contact eligible members by email with details on the consultation.</p>
      <h2>The build service</h2>
      <p>On a build link from the GG PC extension you can order in one of two ways.</p>
      <ul>
        <li><strong>Build it for me.</strong> We buy the parts and build the PC. You pay the store prices at cost, plus a sourcing fee of {sourcingFeePercent}% of the parts and a build fee of {formatAed(ORDER.buildFeeFils)}. Your card is held at checkout and we only charge it after we have bought the parts. If a store price is higher when we buy, we ask you before charging more, or we cancel the hold.</li>
        <li><strong>I buy, you build.</strong> You buy the parts yourself from the list, send them to our workshop, and pay only the {formatAed(ORDER.buildFeeFils)} build fee.</li>
      </ul>
      <p>Part prices come from our price data and show how old each price is. They can change before we buy. Some store links in the shopping list earn GG PC a small commission at no cost to you.</p>
      <h2>Who you are buying from</h2>
      <p>The seller is Lari Ventures LLC (GG PC). Payments are taken by card in AED. Your card statement shows &quot;LARI VENTURES* {ORDER.statementDescriptorSuffix}&quot;.</p>
      <h2>Example prices and builds</h2>
      <p>Prices, builds, specs and compatibility results shown on ggpc.app are illustrative examples of how GG PC will work. They are not live offers or quotes, and they are not a compatibility check of your PC. Store names and logos appear as examples only; the stores are not partners or sponsors of GG PC.</p>
      <h2>Changes</h2>
      <p>GG PC is still being built, so features and timing may change. If these terms change, we will update this page.</p>
      <h2>Contact</h2>
      <p>Questions? Ask us on <a href="https://discord.gg/HMd9ZkYHB3">Discord</a>.</p>
    </DocPage>
  )
}
