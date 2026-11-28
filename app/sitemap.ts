import type { MetadataRoute } from "next"
import { chipPath, fetchAllChips } from "@/lib/prices/catalog"

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date("2026-10-16")
  // Price pages come from the live API; if it is down the static pages still list.
  const now = new Date()
  const prices: MetadataRoute.Sitemap = await fetchAllChips()
    .then(chips => chips.map(c => ({ url: `https://www.ggpc.app${chipPath(c.slug)}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })))
    .catch(() => [])
  return [
    { url: "https://www.ggpc.app/price", lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...prices,
    { url: "https://www.ggpc.app", lastModified, changeFrequency: "weekly", priority: 1 },
    { url: "https://www.ggpc.app/builder", lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: "https://www.ggpc.app/guides", lastModified: new Date("2026-10-23"), changeFrequency: "monthly", priority: 0.7 },
    { url: "https://www.ggpc.app/guides/build-a-gaming-pc-uae", lastModified: new Date("2026-10-17"), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://www.ggpc.app/guides/pc-part-compatibility", lastModified: new Date("2026-10-17"), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://www.ggpc.app/guides/first-pc-build-checklist", lastModified: new Date("2026-10-21"), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://www.ggpc.app/guides/pc-build-cost-uae", lastModified: new Date("2026-10-23"), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://www.ggpc.app/guides/buy-a-gpu-uae", lastModified: new Date("2026-10-17"), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://www.ggpc.app/guides/prebuilt-vs-custom-pc-dubai", lastModified: new Date("2026-10-17"), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://www.ggpc.app/privacy", lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: "https://www.ggpc.app/terms", lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: "https://www.ggpc.app/warranty", lastModified: new Date("2026-10-18"), changeFrequency: "yearly", priority: 0.4 },
  ]
}
