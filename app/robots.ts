import type { MetadataRoute } from "next"

const aiCrawlers = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Amazonbot", "CCBot", "Bytespider", "meta-externalagent", "cohere-ai"]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: aiCrawlers, allow: "/", disallow: ["/api/", "/signup", "/admin/"] },
      { userAgent: "*", allow: "/", disallow: ["/api/", "/signup", "/admin/"] },
    ],
    sitemap: "https://www.ggpc.app/sitemap.xml",
    host: "https://www.ggpc.app",
  }
}
