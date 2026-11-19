import type { Metadata } from "next"
import { DocPage } from "@/components/doc-page"
import { ORDER, sourcingFeePercent } from "@/lib/order/config"
import { formatAed } from "@/lib/order/format"
import Link from "next/link"
import { cardCheckoutConfigured } from "@/lib/order/stripe"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Terms | GG PC",
  description: "How GG PC build quotes, service fees and retailer observations work.",
  alternates: { canonical: "/terms" },
}

export default function Terms() {
  const cards = cardCheckoutConfigured()
  return (
    <DocPage title="Terms" updated="November 19, 2026" sections={[
      { id: "extension-accounts", label: "Extension accounts" },
      { id: "your-analytics-choice", label: "Your analytics choice" },
      { id: "private-member-codes", label: "Private member codes" },
      { id: "the-build-service", label: "The build service" },
      { id: "who-you-are-buying-from", label: "Who you are buying from" },
      { id: "example-prices-and-builds", label: "Example prices and builds" },
      { id: "changes", label: "Changes" },
      { id: "contact", label: "Contact" },
    ]}>
      <p>GG PC supports UAE stores, prices in AED and UAE build services. Installation is worldwide. More countries coming soon. A parts plan or WhatsApp quote request does not commit you to buy anything. {cards ? "Card checkout is available on eligible build pages. Review the final fees on Stripe before paying." : "Online card checkout is not available yet."}</p>
      <h2 id="extension-accounts">Extension accounts</h2>
      <p>Version 0.2.5 requires sign-in and acceptance of these terms and the <Link href="/privacy">privacy policy</Link> before extension features can run. This requirement applies after that version is installed; versions 0.2.3 and 0.2.4 retain their optional-account behavior. New signup uses a verified Google or Discord identity. Existing password accounts remain supported. Keep your sign-in details and any recovery code secure. A provider may require you to verify its account before you can continue.</p>
      <p>Signing up does not place an order, join the former waitlist or automatically upload an older guest build. Saved device work is retained through sign-out and is available only in its appropriate workspace after sign-in. Account linking, setting a first password for a provider account and email-based password reset are not offered by this signup flow.</p>
      <h2 id="your-analytics-choice">Your analytics choice</h2>
      <p>Optional feature-usage analytics is off until you choose it. You can sign up and use the extension without enabling it. The <Link href="/privacy">privacy policy</Link> explains the bounded events, account-linked processing, thirty-day active-event retention and how confirmed server withdrawal deletes active usage records. It also explains saved device Off choices, their retention during a device-data clear and how failed preference or withdrawal requests are reported. Public price sharing has a separate setting. Version 0.2.5 does not upload the legacy raw technical error reports; optional analytics uses bounded error categories. We use aggregate usage reports to improve the app, not for advertising or selling your data.</p>
      <h2 id="private-member-codes">Private member codes</h2>
      <p>If you receive a private member code, use it with your original signup email. Eligible codes give {ORDER.ogDiscountRate * 100}% off sourcing and build fees once. Parts, buyer protection and add-ons are excluded. Eligibility is checked against the original first {ORDER.ogSlots} signups; this page does not open a new member registration. The total before checkout uses regular pricing. Stripe shows any confirmed discount before you decide to pay. Without a code, checkout uses regular pricing and does not reserve or use the member benefit. A supplied code that cannot be confirmed stops checkout instead of silently charging full price. A quote request or standalone code check does not reserve or use the benefit or place an order.</p>
      <h2 id="the-build-service">The build service</h2>
      <p>A build link from the GG PC extension or web builder shows two service options. Review the parts and fees, then request a WhatsApp quote. {cards ? "You can use the available card checkout on an eligible build page, or request a private quote." : "The card-payment terms below describe the checkout flow when online payments become available; they do not mean checkout is currently enabled."}</p>
      <ul>
        <li><strong>Build it for me.</strong> We buy the parts and build the PC. You pay the store prices at cost, plus a sourcing fee of {sourcingFeePercent}% of the parts, a build fee of {formatAed(ORDER.buildFeeFils)} and {formatAed(ORDER.protectionFeeFils)} buyer protection. Your card is held at checkout and we only charge it after we have bought the parts. If a store price is higher when we buy, we ask you before charging more, or we cancel the hold.</li>
        <li><strong>I buy, you build.</strong> You buy the parts yourself from the list, send them to our workshop, and pay the {formatAed(ORDER.buildFeeFils)} build fee plus {formatAed(ORDER.protectionFeeFils)} buyer protection.</li>
      </ul>
      <p>Buyer protection covers a QA check on every build (cable management, a 30 minute stress test, memory profile, BIOS version and photos of the inside) and a 2-year warranty on our labour. Parts keep the store and manufacturer warranty.</p>
      <p>Read the <Link href="/warranty">build QA and warranty details</Link>.</p>
      <p>Part prices come from our price data and show how old each price is. They can change before we buy. Some store links in the shopping list earn GG PC a small commission at no cost to you.</p>
      <h2 id="who-you-are-buying-from">Who you are buying from</h2>
      <p>The seller is Lari Ventures LLC (GG PC). Card payments are in AED. When checkout is available, your card statement will show &quot;LARI VENTURES* {ORDER.statementDescriptorSuffix}&quot;.</p>
      <h2 id="example-prices-and-builds">Example prices and builds</h2>
      <p>Homepage parts artwork is illustrative, not a compatibility check of your PC. Builder and build pages use real retailer observations and show their age. Those observations are not guaranteed stock or final store prices. Confirm exact specifications, stock and prices before buying. Stores are not partners or sponsors of GG PC.</p>
      <h2 id="changes">Changes</h2>
      <p>GG PC is still being built, so features and timing may change. If these terms change, we will update this page.</p>
      <h2 id="contact">Contact</h2>
      <p>Questions? Ask us on <a href="https://discord.gg/HMd9ZkYHB3">Discord</a>.</p>
    </DocPage>
  )
}
