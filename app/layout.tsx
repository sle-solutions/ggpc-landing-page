import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const inter = localFont({ src: "../public/fonts/inter-latin.woff2", variable: "--font-inter", weight: "400 800", display: "swap" })
const pixel = localFont({ src: "../public/fonts/press-start-2p-latin.woff2", variable: "--font-pixel", weight: "400", display: "swap" })

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ggpc.app"),
  title: "GG PC | Plan your PC build in the UAE",
  description: "Gear up your first PC one part at a time. Compare UAE part prices, check compatibility, and join the GG PC waitlist for early access.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "GG PC | Build. Compare. Game.",
    description: "Plan your first PC like a loadout. UAE prices side by side, compatibility checked as you go. Join the waitlist.",
    url: "https://www.ggpc.app", siteName: "GG PC", locale: "en_AE", type: "website",
  },
  twitter: { card: "summary", title: "GG PC | Plan your PC build in the UAE", description: "Compare UAE part prices and check parts fit before you buy. Join the waitlist for early access." },
  icons: "/ggpc-icon.ico",
}
export const viewport: Viewport = { themeColor: "#0d0d0d", colorScheme: "dark", width: "device-width", initialScale: 1, viewportFit: "cover" }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${pixel.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
