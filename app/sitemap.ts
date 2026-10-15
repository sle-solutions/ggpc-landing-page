import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-10-16")
  return [
    { url: "https://www.ggpc.app", lastModified, changeFrequency: "weekly", priority: 1 },
    { url: "https://www.ggpc.app/privacy", lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: "https://www.ggpc.app/terms", lastModified, changeFrequency: "yearly", priority: 0.3 },
  ]
}
