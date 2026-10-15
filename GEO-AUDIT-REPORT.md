# GG PC GEO and SEO audit (www.ggpc.app, 16 October 2026)

## Baseline scores (before fixes)

| Category | Weight | Score |
|---|---|---|
| AI citability and visibility | 25% | 43 |
| Brand authority | 20% | 8 |
| Content and E-E-A-T | 20% | 39 |
| Technical foundations | 15% | 74 |
| Structured data | 10% | 5 |
| Platform readiness | 10% | 22 |
| **Composite GEO score** | | **34 / 100** |

Business type: pre-launch consumer tool (waitlist landing page), UAE.

## Fixed and deployed (commit bb1bcd1)

- Crawlability: `robots.txt` with explicit AI crawler access, `sitemap.xml`, `llms.txt`.
- Structured data: one server-rendered `@graph` with Organization (sameAs Discord, X, Instagram), Person (Ali Lari), WebSite, WebPage and FAQPage generated from the visible FAQ. No Offer, price or rating markup, because prices are illustrative.
- Sharing: 1200x630 Open Graph and Twitter images with alt text, `summary_large_image` card, favicon and apple icon served from `/`.
- Trust: `/privacy`, `/terms` and a branded 404, linked from the footer and both signup forms. The retailers are now noted as examples, not partners.
- Answerability: a plain one-line definition under the hero, plus three new FAQ answers (what GG PC is, whether the prices are real, whether it sells parts). The unsourced "2x" claim is rewritten, and features not yet launched are marked "At launch" or "Planned".
- Speed:
  - Sprites are served as cached static SVGs instead of inline path data, cutting the page HTML from 236KB to 145KB.
  - Logos and the founder photo are right-sized WebP.
  - Logo preloads that competed with LCP are removed.
  - Tailwind no longer generates CSS for the unused `components/ui`.
  - The Discord count route is edge-cached for 5 minutes.
- Security: nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, HSTS with includeSubDomains and preload.

## Needs the owner (cannot be done from the repo)

1. In Vercel Domains, change the `ggpc.app` to `www` redirect from 307 to 308 (permanent).
2. Verify the site in Google Search Console and Bing Webmaster Tools, then submit `https://www.ggpc.app/sitemap.xml`.
3. Off-site brand footprint: create a LinkedIn company page, use one consistent bio on X, Instagram and Discord, and take part genuinely in r/dubai, r/UAE and r/PCBuildUAE as the disclosed founder. Then add those profiles to `sameAs`.
4. Founder links: share Ali's LinkedIn or X if you want them on the page and in the Person schema.
5. A contact email such as hello@ggpc.app, for the footer and privacy page.
6. Facts for further FAQ answers: is GG PC free, which stores it will cover, website or extension.
7. After launch: dated guide pages (for example "build a gaming PC in the UAE") and per-part UAE price pages. These are what can earn citations for generic "PC part prices UAE" queries.
