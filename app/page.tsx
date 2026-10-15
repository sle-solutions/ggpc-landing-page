import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { ProblemSection } from "@/components/problem-section"
import { ProductPreview } from "@/components/product-preview"
import { HowItWorks } from "@/components/how-it-works"
import { BuildPaths } from "@/components/build-paths"
import { Founders } from "@/components/founders"
import { FAQ } from "@/components/faq"
import { FinalCTA } from "@/components/final-cta"
import { DiscordCTA } from "@/components/discord-cta"
import { Footer } from "@/components/footer"
import { StickyCta } from "@/components/sticky-cta"
import { BuildBriefProvider } from "@/components/build-brief"
import { StructuredData } from "@/components/structured-data"

export default function Home() {
  return (
    <BuildBriefProvider>
      <StructuredData />
      <Navbar />
      <main id="main-content">
        <HeroSection />
        <ProblemSection />
        <ProductPreview />
        <HowItWorks />
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
