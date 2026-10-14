import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const inter = localFont({ src: "../public/fonts/inter-latin.woff2", variable: "--font-inter", weight: "400 800", display: "swap" })
const pixel = localFont({ src: "../public/fonts/press-start-2p-latin.woff2", variable: "--font-pixel", weight: "400", display: "swap" })

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ggpc.app"),
  title: "GG PC | Plan your PC build in the UAE",
  description: "Compare UAE PC part prices, check compatibility, and get help choosing what fits your budget. Join the GG PC waitlist for early access news.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Your first PC, with fewer expensive guesses. | GG PC",
    description: "A clearer way to plan a PC build in the UAE. Local prices, compatibility checks, and help choosing your parts. Join the waitlist.",
    url: "https://www.ggpc.app", siteName: "GG PC", locale: "en_AE", type: "website",
  },
  twitter: { card: "summary", title: "GG PC | Plan your PC build in the UAE", description: "Compare local prices and check parts before you buy. Join the waitlist for early access news." },
  icons: "/ggpc-icon.ico",
}
export const viewport: Viewport = { themeColor: "#0d0d0d", width: "device-width", initialScale: 1 }

const direction = `<!--
THESIS: A PC-build gaming poster in GG PC's Fire Red identity, with an oversized slogan, tangible hardware, and an immediate signup.
OWN-WORLD: Original red/orange pixel GG mark, Press Start 2P headlines, Inter body, black and dark-red surfaces, vivid Fire Red actions.
STORY: Recognize the UAE build frustrations, compare local prices, play a short build quest, meet the founder, and join for the confirmed OG perks.
FIRST VIEWPORT: Original GG mark; stacked BUILD. COMPARE. GAME. headline over hardware; clear first-PC proposition, email form, and first-100 offer together.
FORM: User-pinned current brand, superseding pale build bench identity; source brand guide and logos from supplied archive; seed 6a564b75 retained as layout history.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${pixel.variable}`}>
      <body>
        <template id="ggpc-direction" dangerouslySetInnerHTML={{ __html: direction }} />
        <a className="skip-link" href="#main-content">Skip to content</a>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
