import type { Metadata } from "next"
import Link from "next/link"
import { Glyph } from "@/components/pixel"
import { GuideShell } from "@/components/guide-shell"

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
    dateTime: "2026-10-17",
    steps: ["Budget", "Parts", "Fit", "Prices", "Build"],
  },
  {
    href: "/guides/pc-part-compatibility",
    title: "PC part compatibility explained: how to check your build fits (2026)",
    description: "Eight checks in the right order: CPU socket, BIOS, RAM type, GPU size, PSU connectors, cooler, case and M.2 slots.",
    updated: "17 October 2026",
    dateTime: "2026-10-17",
    steps: ["Socket", "RAM", "GPU", "PSU", "Cooler", "Case", "M.2"],
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
    <GuideShell
      crumbs={[{ label: "Home", href: "/" }, { label: "Guides" }]}
      title="PC building guides for the UAE"
      meta={<>Updated <time dateTime="2026-10-17">17 October 2026</time></>}
      lede={<p className="guide-lede">These guides are written for gamers building a PC in the UAE, especially first timers. They use AED, UAE stores and plain English.</p>}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ul className="guide-cards">
        {guides.map(guide => (
          <li key={guide.href} className="guide-card frame">
            <h2><Link href={guide.href}>{guide.title}</Link></h2>
            <p>{guide.description}</p>
            <ol className="guide-card-steps" aria-label="Steps covered">
              {guide.steps.map((step, i) => (
                <li key={step}><span className="toc-node" aria-hidden="true">{i + 1}</span>{step}</li>
              ))}
            </ol>
            <div className="guide-card-foot">
              <span className="guide-card-date">Updated <time dateTime={guide.dateTime}>{guide.updated}</time></span>
              <span className="guide-card-cta" aria-hidden="true">Read the guide<Glyph name="arrowRight" size={16} /></span>
            </div>
          </li>
        ))}
      </ul>
    </GuideShell>
  )
}
