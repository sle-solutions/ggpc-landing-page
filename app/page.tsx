import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { ProductPreview } from "@/components/product-preview"
import { ExtensionCaptures } from "@/components/extension-captures"
import { BuildPaths } from "@/components/build-paths"
import { Founders } from "@/components/founders"
import { FAQ } from "@/components/faq"
import { FinalCTA } from "@/components/final-cta"
import { DiscordCTA } from "@/components/discord-cta"
import { Footer } from "@/components/footer"
import { StickyCta } from "@/components/sticky-cta"
import { BuildBriefProvider } from "@/components/build-brief"
import { StructuredData } from "@/components/structured-data"
import { WhiteFridayBanner } from "@/components/white-friday-campaign"
import { allowWhiteFridayPreview } from "@/lib/campaign/white-friday"

export default function Home() {
  return (
    <BuildBriefProvider>
      <StructuredData />
      <Navbar />
      <WhiteFridayBanner forcePreview={allowWhiteFridayPreview(process.env)} />
      <main id="main-content">
        <HeroSection />
        <ProductPreview />
        <ExtensionCaptures />
        <BuildPaths />
        <Founders />
        <FAQ />
        <FinalCTA />
        <DiscordCTA />
      </main>
      <Footer />
      <StickyCta />
    </BuildBriefProvider>
  )
}
