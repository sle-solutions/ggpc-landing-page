import type { Metadata } from "next"
import Link from "next/link"
import { Glyph, Sprite } from "@/components/pixel"
import { GuideShell } from "@/components/guide-shell"

const site = "https://www.ggpc.app"

export const metadata: Metadata = {
  title: "PC building guides for the UAE | GG PC",
  description: "Plain English PC building guides for gamers in the UAE: budgets in AED, choosing parts, checking compatibility and comparing store prices.",
  alternates: { canonical: "/guides" },
}

const guides = [
  { slug: "build-a-gaming-pc-uae", title: "Build your first gaming PC", description: "From setting a budget in AED to the first boot.", sprite: "rig" },
  { slug: "pc-build-cost-uae", title: "Set a realistic PC budget", description: "Compare parts costs, assembly fees and what you can spend.", sprite: "cpu" },
  { slug: "buy-a-gpu-uae", title: "Choose a graphics card", description: "Start with your monitor, then check memory, size and power.", sprite: "gpu" },
  { slug: "pc-part-compatibility", title: "Check which parts fit", description: "Work through sockets, connectors and case clearance.", sprite: "motherboard" },
  { slug: "first-pc-build-checklist", title: "First build checklist", description: "Keep this list beside you at the workbench.", sprite: "brief" },
  { slug: "prebuilt-vs-custom-pc-dubai", title: "Prebuilt or custom in Dubai?", description: "Compare off-the-shelf PCs, assembly services and DIY.", sprite: "ram" },
] as const

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
      dateModified: "2026-11-19",
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
      title="UAE PC field guide"
      meta={<>Updated <time dateTime="2026-11-19">November 19, 2026</time></>}
      lede={<p className="guide-lede">What do you need help with?</p>}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ul className="manual-index">
        {guides.map(guide => (
          <li key={guide.slug}>
            <Link href={`/guides/${guide.slug}`}>
              <span className="manual-icon"><Sprite name={guide.sprite} scale={2} /></span>
              <span><strong>{guide.title}</strong><small>{guide.description}</small></span>
              <Glyph name="arrowRight" />
            </Link>
          </li>
        ))}
      </ul>
    </GuideShell>
  )
}
