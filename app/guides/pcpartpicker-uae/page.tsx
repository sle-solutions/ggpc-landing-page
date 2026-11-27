import type { Metadata } from "next"
import Link from "next/link"
import { GuideChecklist, BackToGuides, GuideNext, GuideSection, GuideShell, type TocItem } from "@/components/guide-shell"

const site = "https://www.ggpc.app"
const url = `${site}/guides/pcpartpicker-uae`
const headline = "Does PCPartPicker work in the UAE? How to price a parts list in AED (2026)"

export const metadata: Metadata = {
  title: `${headline} | GG PC`,
  description: "PCPartPicker has no UAE region, so it shows no AED prices or UAE stores. What still works, what does not, and how to price a PCPartPicker list at UAE stores.",
  alternates: { canonical: "/guides/pcpartpicker-uae" },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${url}#article`,
      headline,
      description: "Whether PCPartPicker works in the UAE, what it can and cannot do for UAE builders, and how to price a parts list at UAE stores in AED.",
      datePublished: "2026-11-27",
      dateModified: "2026-11-27",
      inLanguage: "en-AE",
      author: { "@type": "Person", name: "Ali Lari" },
      publisher: { "@id": `${site}/#organization` },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site },
        { "@type": "ListItem", position: 2, name: "Guides", item: `${site}/guides` },
        { "@type": "ListItem", position: 3, name: headline, item: url },
      ],
    },
  ],
}

const toc: TocItem[] = [
  { id: "uae-region", label: "Does PCPartPicker have a UAE region?", marker: "1" },
  { id: "what-works", label: "What PCPartPicker still does well for UAE builders", marker: "2" },
  { id: "what-does-not", label: "Why other regions' prices mislead in the UAE", marker: "3" },
  { id: "price-in-aed", label: "How to price a PCPartPicker list in the UAE", marker: "4" },
  { id: "uae-part-picker", label: "Is there a PC part picker for the UAE?", marker: "5" },
  { id: "before-you-buy", label: "Before you buy", marker: "check" },
]

const checklist = [
  "Every part on the list has an exact model name or number.",
  "Each price was checked at a UAE store, in AED, with 5% VAT included.",
  "Delivery fees and stock were checked, not just the listed price.",
  "The warranty for each part is local or international, and you know which.",
  "The compatibility check was run on the final list, after any swaps.",
  "The price check is dated, because UAE prices move.",
]

export default function PcPartPickerUae() {
  return (
    <GuideShell
      crumbs={[{ label: "Home", href: "/" }, { label: "Guides", href: "/guides" }, { label: headline }]}
      title="PCPartPicker in the UAE"
      sprite="motherboard"
      meta={<>By Ali Lari, founder of GG PC <span aria-hidden="true">/</span> Updated <time dateTime="2026-11-27">November 27, 2026</time></>}
      lede={<p className="guide-lede">PCPartPicker works in the UAE for planning a build and checking that parts fit. It has no UAE region, so it does not show AED prices or UAE stores. Plan there if you like, then price each part at UAE stores before you buy.</p>}
      toc={toc}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <GuideSection id="uae-region" marker="1" title="Does PCPartPicker have a UAE region?">
        <p>No. On November 27, 2026, the country menu on pcpartpicker.com listed 24 regions, and the United Arab Emirates was not one of them. Saudi Arabia is the only Gulf country on the list. Without a UAE region, PCPartPicker cannot show you prices in AED or listings from UAE stores.</p>
        <p>The site still opens and works from the UAE. You just pick another region, and the prices you see belong to that region&apos;s stores.</p>
      </GuideSection>

      <GuideSection id="what-works" marker="2" title="What PCPartPicker still does well for UAE builders">
        <p>The planning side does not depend on your country. These parts of PCPartPicker are just as useful in Dubai as anywhere else:</p>
        <ul className="guide-bullets">
          <li>Building a parts list, one category at a time.</li>
          <li>Flagging parts that do not fit together, such as a CPU and a motherboard with different sockets.</li>
          <li>An estimated wattage for the build, which helps you size the power supply.</li>
          <li>Sharing the list with a friend or a forum, so someone can check it.</li>
        </ul>
        <p>Automatic checks catch the common mistakes, not all of them. Case clearance, cooler height and BIOS support are worth a manual look. The <Link href="/guides/pc-part-compatibility">PC part compatibility guide</Link> walks through each check in order.</p>
      </GuideSection>

      <GuideSection id="what-does-not" marker="3" title="Why other regions' prices mislead in the UAE">
        <p>A total from the US, UK or Saudi region tells you little about the UAE price of the same parts. Three things change it:</p>
        <ul className="guide-bullets">
          <li>The stores are different. A US or Saudi listing is not something you can order from a UAE store at that price.</li>
          <li>Tax is different. UAE prices include 5% VAT, while US prices are usually shown before sales tax.</li>
          <li>Stock and local pricing are different. The cheapest card in one country can be scarce or more expensive in another.</li>
        </ul>
        <p>Converting the currency does not fix this. The dirham is pegged at 3.6725 to the US dollar, so the conversion itself is simple, but a converted US total is still a US price. Treat it as a rough reference, never as your budget.</p>
      </GuideSection>

      <GuideSection id="price-in-aed" marker="4" title="How to price a PCPartPicker list in the UAE">
        <p>Keep the list you planned, then check every part at UAE stores by hand or with a tool. This order works:</p>
        <ol className="guide-order">
          <li>Copy the exact model name or number of each part. Similar names can be different products.</li>
          <li>Search for each model at two or three UAE stores and note the AED price with VAT.</li>
          <li>Add delivery fees and check stock. A part that ships in three weeks may not be worth the saving.</li>
          <li>Check whether the warranty is local or international, and who the seller is.</li>
          <li>If a part is missing or overpriced, swap it for a close alternative, then run the compatibility check again.</li>
          <li>Write down the date of your price check. UAE prices can change within days.</li>
        </ol>
        <p>The <Link href="/guides/pc-build-cost-uae">gaming PC cost guide</Link> covers budgets in AED and how to find cheaper parts. For graphics cards in particular, read the <Link href="/guides/buy-a-gpu-uae">graphics card buying guide</Link> before you buy.</p>
      </GuideSection>

      <GuideSection id="uae-part-picker" marker="5" title="Is there a PC part picker for the UAE?">
        <p>GG PC is built for this gap. The <Link href="/builder">GG PC builder</Link> lets you pick parts and checks compatibility as you add them. It also shows prices in AED from five UAE stores: Amazon.ae, noon, Microless, Gear-Up and GCC Gamers. That is the list GG PC supports, not every seller in the UAE, so check any other shop you trust the same way.</p>
        <p>You can also use both. Plan in PCPartPicker, then rebuild the list in GG PC to see UAE prices. Whichever you use, confirm the final price and stock at the store before you pay.</p>
      </GuideSection>

      <GuideSection id="before-you-buy" marker="check" title="Before you buy">
        <p>Run through this list before you order anything.</p>
        <GuideChecklist items={checklist} />
        <aside className="guide-note frame" aria-label="A note on this check">
          <span className="guide-tag">Checked</span>
          <p>The PCPartPicker region list was checked on 2026-11-27. Sites change, so check the country menu on pcpartpicker.com if this matters to you.</p>
        </aside>
      </GuideSection>

      <GuideNext title="Ready to price your parts?">
        <p>Pick parts with UAE prices in AED, or bring your list to the community.</p>
      </GuideNext>

      <BackToGuides />
    </GuideShell>
  )
}
