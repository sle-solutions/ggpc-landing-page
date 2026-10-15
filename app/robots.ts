import type { MetadataRoute } from "next"

const aiCrawlers = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Amazonbot", "CCBot", "Bytespider", "meta-externalagent", "cohere-ai"]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: aiCrawlers, allow: "/", disallow: "/api/" },
      { userAgent: "*", allow: "/", disallow: "/api/" },
    ],
    sitemap: "https://www.ggpc.app/sitemap.xml",
    host: "https://www.ggpc.app",
  }
}
