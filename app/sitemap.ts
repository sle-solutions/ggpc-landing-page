import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-10-16")
  return [
    { url: "https://www.ggpc.app", lastModified, changeFrequency: "weekly", priority: 1 },
    { url: "https://www.ggpc.app/guides", lastModified: new Date("2026-10-17"), changeFrequency: "monthly", priority: 0.7 },
    { url: "https://www.ggpc.app/guides/build-a-gaming-pc-uae", lastModified: new Date("2026-10-17"), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://www.ggpc.app/guides/pc-part-compatibility", lastModified: new Date("2026-10-17"), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://www.ggpc.app/guides/first-pc-build-checklist", lastModified: new Date("2026-10-17"), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://www.ggpc.app/guides/buy-a-gpu-uae", lastModified: new Date("2026-10-17"), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://www.ggpc.app/privacy", lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: "https://www.ggpc.app/terms", lastModified, changeFrequency: "yearly", priority: 0.3 },
  ]
}
