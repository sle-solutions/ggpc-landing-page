import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import { PublicAnalytics } from "@/components/public-analytics"
import "./globals.css"
import "./workbench.css"

const pixel = localFont({ src: "../public/fonts/press-start-2p-latin.woff2", variable: "--font-pixel", weight: "400", display: "swap" })
const bodyFont = localFont({ src: "../public/fonts/instrument-sans.woff2", variable: "--font-body", weight: "400 700", display: "swap" })
const displayFont = localFont({ src: "../public/fonts/bricolage-grotesque.woff2", variable: "--font-display", weight: "200 800", display: "swap" })

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ggpc.app"),
  title: "GG PC | Plan your PC build in the UAE",
  description: "Gear up your first PC one part at a time. Compare UAE part prices, check compatibility, and install GG PC for Chrome.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "GG PC | Plan your first PC",
    description: "Plan your first PC like a loadout. UAE prices side by side, compatibility checked as you go. Install GG PC for Chrome.",
    url: "https://www.ggpc.app", siteName: "GG PC", locale: "en_AE", type: "website",
  },
  twitter: { card: "summary_large_image", site: "@ggpcapp", title: "GG PC | Plan your PC build in the UAE", description: "Compare UAE part prices and check parts fit before you buy. Install GG PC for Chrome." },
  applicationName: "GG PC",
  keywords: ["PC building UAE", "gaming PC UAE", "PC part prices UAE", "PC compatibility checker", "build a PC Dubai", "PC parts AED"],
  authors: [{ name: "Ali Lari" }],
  creator: "GG PC",
  formatDetection: { telephone: false },
}
export const viewport: Viewport = { themeColor: "#0d0d0d", colorScheme: "dark", width: "device-width", initialScale: 1, viewportFit: "cover" }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable} ${pixel.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        {children}
        <PublicAnalytics />
      </body>
    </html>
  )
}
