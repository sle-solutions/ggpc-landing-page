/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
]

const localTestRedirect = process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(process.env.IDENTITY_PUBLIC_ORIGIN || "") && /^https:\/\/[a-p]{32}\.chromiumapp\.org\/ggpc-auth$/.test(process.env.IDENTITY_TEST_EXTENSION_REDIRECT || "") ? new URL(process.env.IDENTITY_TEST_EXTENSION_REDIRECT).origin : ""
const identityHeaders = [
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self' https://accounts.google.com https://discord.com https://hnkngjlliafocefngenbofeddalifcjk.chromiumapp.org" + (localTestRedirect ? ` ${localTestRedirect}` : "") },
]

const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      { source: "/signup", headers: identityHeaders },
      { source: "/admin/:path*", headers: identityHeaders },
      { source: "/api/identity/:path*", headers: identityHeaders },
      { source: "/sprites/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
      { source: "/(brand|retailers|images)/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }] },
    ]
  },
}

export default nextConfig
