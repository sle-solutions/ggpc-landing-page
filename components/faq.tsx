import { Glyph } from "@/components/pixel"
import { ORDER, sourcingFeePercent } from "@/lib/order/config"
import { formatAed } from "@/lib/order/format"
import Link from "next/link"

export const faqs = [
  { question: "What is GG PC?", answer: "GG PC helps you plan a PC, compare supported UAE store prices in AED and check compatibility. Use the Chrome extension while you shop, or start with the web builder." },
  { question: "Can I use GG PC yet?", answer: "Yes. Install GG PC from the Chrome Web Store on desktop Chrome, or use the web builder. Installation is worldwide. Supported stores, AED prices and build services are UAE only. More countries coming soon." },
  { question: "Is it useful if I've never built a PC?", answer: "That's exactly who it's for. GG PC helps you choose parts, compare local prices, and check compatibility, and you can get help planning your build." },
  { question: "What if I want someone to build it for me?", answer: `That's the GG PC build service. We buy your parts at the store price plus a ${sourcingFeePercent}% sourcing fee, build and test the PC for an ${formatAed(ORDER.buildFeeFils)} build fee, and add ${formatAed(ORDER.protectionFeeFils)} buyer protection. Already have the parts? Send them to our workshop and pay only the build fee and buyer protection.` },
  { question: "What does buyer protection cover?", answer: `Every build gets a QA check: cable management, a 30 minute stress test, memory profile, BIOS version and photos of the inside. Our labour has a 2-year warranty, and parts keep their store and manufacturer warranty. It is ${formatAed(ORDER.protectionFeeFils)} flat on every build.` },
  { question: "What makes GG PC useful for UAE builders?", answer: "GG PC is built for buying a PC in the UAE. It shows PC part prices from UAE stores side by side in AED, so you can compare them without visiting each store, and check compatibility as you plan. Always confirm exact specifications before buying." },
  { question: "Can I plan before I buy?", answer: "Yes. Build a parts list and track prices in the extension. You can plan locally without creating an account. Saving a build to an account is a separate choice." },
  { question: "Are the prices on this page real?", answer: "The homepage parts artwork is illustrative and contains no live offer. The web builder, build quote pages and extension use retailer observations. Check the observation time and confirm the final price and stock at the store." },
  { question: "Does GG PC sell PC parts?", answer: "No. GG PC is a price comparison and build planning tool, not a store. For assembly and testing, review a build and request a WhatsApp quote. Online card checkout is not available yet. GG PC is not affiliated with similarly named PC builders or stores." },
  { question: "Can I pay online?", answer: "Online card checkout is not available yet. Use the WhatsApp quote action on the builder or build page to discuss your parts, fees and next steps. A quote request does not place a paid order." },
]

export function FAQ() {
  return (
    <section id="faq" className="faq" aria-labelledby="faq-heading">
      <div className="page-width faq-grid">
        <div className="faq-intro">
          <h2 id="faq-heading">Before you press start.</h2>
          <p>Quick answers before your first build.</p>
        </div>
        <div className="faq-list">
          {faqs.map(faq => (
            <details key={faq.question}>
              <summary><span>{faq.question}</span><Glyph name="plus" size={16} className="faq-open" /><Glyph name="minus" size={16} className="faq-close" /></summary>
              <p>{faq.answer}{faq.question === "What does buyer protection cover?" ? <> <Link href="/warranty">See the build QA and warranty details.</Link></> : null}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
