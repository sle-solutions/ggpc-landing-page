import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GG PC: UAE's First All-in-One PC Builder",
  description:
    "Stop overpaying for PC parts in the UAE. Compare prices across every store, check compatibility instantly, or let us build your dream rig. Join the waitlist for 20% off.",
  keywords: [
    "PC parts UAE",
    "gaming PC Dubai",
    "PC price comparison UAE",
    "build gaming PC UAE",
    "computer parts Abu Dhabi",
    "PCPartPicker UAE",
    "custom PC build UAE",
  ],
  authors: [{ name: "GG PC" }],
  generator: "v0.app",
  openGraph: {
    title: "GG PC: Stop Overpaying. Start Gaming.",
    description:
      "The UAE's first price comparison platform for PC parts. Compare prices, check compatibility, and get your dream rig built.",
    url: "https://ggpc.ae",
    siteName: "GG PC",
    locale: "en_AE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GG PC: UAE's First All-in-One PC Builder",
    description: "Stop overpaying for PC parts in the UAE. Join the waitlist for 20% off your first build.",
  },
  icons: "/ggpc-icon.ico",
}

export const viewport: Viewport = {
  themeColor: "#FF0040",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
