import { faqs } from "@/components/faq"

const site = "https://www.ggpc.app"

// Server-rendered JSON-LD. No offers, prices or ratings: marketing illustrations are not live offers.
const graph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${site}/#organization`,
      name: "GG PC",
      url: site,
      logo: { "@type": "ImageObject", "@id": `${site}/#logo`, url: `${site}/brand/gg-mark-dark.png`, contentUrl: `${site}/brand/gg-mark-dark.png`, width: 800, height: 800, caption: "GG PC" },
      image: { "@id": `${site}/#logo` },
      slogan: "Build. Compare. Game.",
      description: "GG PC helps people plan PC builds, check compatibility and compare supported UAE retailer prices in AED. Installation is worldwide; stores and build services are UAE only.",
      areaServed: { "@type": "Country", name: "United Arab Emirates", identifier: "AE" },
      knowsAbout: ["PC building", "PC component compatibility", "PC part price comparison", "Gaming PCs"],
      founder: { "@id": `${site}/#founder` },
      sameAs: ["https://twitter.com/ggpcapp", "https://www.instagram.com/ggpc.app/", "https://discord.gg/HMd9ZkYHB3"],
    },
    {
      "@type": "Person",
      "@id": `${site}/#founder`,
      name: "Ali Lari",
      jobTitle: "Founder",
      worksFor: { "@id": `${site}/#organization` },
      image: { "@type": "ImageObject", url: `${site}/images/ali-lari.webp`, width: 360, height: 640 },
      url: `${site}/#story`,
      sameAs: ["https://alilari.dev/about"],
      knowsAbout: ["PC gaming", "PC building", "UAE PC hardware market"],
    },
    {
      "@type": "WebSite",
      "@id": `${site}/#website`,
      url: site,
      name: "GG PC",
      inLanguage: "en-AE",
      publisher: { "@id": `${site}/#organization` },
    },
    {
      "@type": "WebPage",
      "@id": `${site}/#webpage`,
      url: site,
      name: "GG PC | Plan your PC build in the UAE",
      description: "Gear up your first PC one part at a time. Compare UAE part prices, check compatibility, and install GG PC for Chrome.",
      inLanguage: "en-AE",
      isPartOf: { "@id": `${site}/#website` },
      about: { "@id": `${site}/#organization` },
      primaryImageOfPage: { "@type": "ImageObject", url: `${site}/opengraph-image` },
      dateModified: "2026-11-06",
      speakable: { "@type": "SpeakableSpecification", cssSelector: [".hero-define", "#faq details"] },
    },
    {
      "@type": "FAQPage",
      "@id": `${site}/#faq`,
      isPartOf: { "@id": `${site}/#webpage` },
      inLanguage: "en-AE",
      mainEntity: faqs.map(faq => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
    },
  ],
}

export function StructuredData() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }} />
}
