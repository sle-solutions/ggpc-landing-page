import type { Metadata } from "next"
import Link from "next/link"
import { DocPage } from "@/components/doc-page"
import { ORDER } from "@/lib/order/config"
import { formatAed } from "@/lib/order/format"
import { normalizeWhatsAppNumber } from "@/lib/order/whatsapp"

const site = "https://www.ggpc.app"

export const metadata: Metadata = {
  title: "Build QA and labour warranty | GG PC",
  description: "What GG PC checks on each build and how the two-year labour warranty relates to store and manufacturer part warranties.",
  alternates: { canonical: "/warranty" },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${site}/warranty#webpage`,
      url: `${site}/warranty`,
      name: "Build QA and labour warranty",
      description: "What GG PC checks on each build and how the two-year labour warranty relates to store and manufacturer part warranties.",
      inLanguage: "en-AE",
      isPartOf: { "@id": `${site}/#website` },
      publisher: { "@id": `${site}/#organization` },
      about: { "@id": `${site}/#organization` },
      breadcrumb: { "@id": `${site}/warranty#breadcrumb` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${site}/warranty#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site },
        { "@type": "ListItem", position: 2, name: "Build QA and warranty", item: `${site}/warranty` },
      ],
    },
  ],
}

export default function WarrantyPage() {
  const whatsapp = normalizeWhatsAppNumber(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER)

  return (
    <DocPage title="Build QA and warranty" updated="18 October 2026">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <p>Every GG PC build includes buyer protection for {formatAed(ORDER.protectionFeeFils)}. It covers a quality check, a 30-minute stress test, photos of the inside and a two-year warranty on GG PC&apos;s labour.</p>
      <h2>What the build check covers</h2>
      <ul>
        <li>Cable management and visible connections.</li>
        <li>A 30-minute stress test, with the result recorded.</li>
        <li>The memory profile and BIOS version recorded.</li>
        <li>Photos of the inside of the finished build.</li>
      </ul>
      <p>The check records what was done on that order. It does not replace a part maker&apos;s warranty.</p>
      <h2>Labour and part warranties</h2>
      <p>The two-year warranty covers GG PC&apos;s labour. Parts keep the warranty offered by the store and manufacturer. Contact the relevant store or manufacturer about a part warranty. For questions or to report a labour warranty claim, contact GG PC on WhatsApp.</p>
      <h2>When you contact GG PC</h2>
      <p>Include your order ID, what issue you are seeing and when you first noticed it. Share photos if they help explain the issue, and include the QA record reference if you have it.</p>
      {whatsapp ? <p><a href={`https://wa.me/${whatsapp}`}>Contact GG PC on WhatsApp</a></p> : <p>If the WhatsApp link is unavailable, contact GG PC through the channel used for your order.</p>}
      <p>Buyer protection is {formatAed(ORDER.protectionFeeFils)} per build. See the <Link href="/terms">build service terms</Link> for the order lanes and fees.</p>
    </DocPage>
  )
}
