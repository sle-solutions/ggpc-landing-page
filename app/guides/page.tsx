import type { Metadata } from "next"
import Link from "next/link"
import { DocPage } from "@/components/doc-page"

const site = "https://www.ggpc.app"

export const metadata: Metadata = {
  title: "PC building guides for the UAE | GG PC",
  description: "Plain English PC building guides for gamers in the UAE: budgets in AED, choosing parts, checking compatibility and comparing store prices.",
  alternates: { canonical: "/guides" },
}

const guides = [
  {
    href: "/guides/build-a-gaming-pc-uae",
    title: "How to build a gaming PC in the UAE (2026)",
    description: "Five steps from budget to build: set your AED budget, pick parts in order, check they fit, compare UAE store prices and assemble.",
    updated: "17 October 2026",
  },
]

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": `${site}/guides#webpage`,
      url: `${site}/guides`,
      name: "PC building guides for the UAE",
      description: "Plain English PC building guides for gamers in the UAE.",
      inLanguage: "en-AE",
      dateModified: "2026-10-17",
      isPartOf: { "@id": `${site}/#website` },
      publisher: { "@id": `${site}/#organization` },
      breadcrumb: { "@id": `${site}/guides#breadcrumb` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${site}/guides#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site },
        { "@type": "ListItem", position: 2, name: "Guides", item: `${site}/guides` },
      ],
    },
  ],
}

export default function Guides() {
  return (
    <DocPage title="PC building guides for the UAE" updated="17 October 2026" updatedLabel="Updated">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <p>These guides are written for gamers building a PC in the UAE, especially first timers. They use AED, UAE stores and plain English.</p>
      <ul className="guide-list">
        {guides.map(guide => (
          <li key={guide.href}>
            <h2><Link href={guide.href}>{guide.title}</Link></h2>
            <p>{guide.description}</p>
            <p className="doc-updated">Updated {guide.updated}</p>
          </li>
        ))}
      </ul>
    </DocPage>
  )
}
