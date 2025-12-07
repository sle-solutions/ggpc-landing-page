"use client"

import { useState, useEffect } from "react"
import { HeroSection } from "@/components/hero-section"
import { ProblemSection } from "@/components/problem-section"
import { SolutionSection } from "@/components/solution-section"
import { ProductPreview } from "@/components/product-preview"
import { HowItWorks } from "@/components/how-it-works"
import { ValueStack } from "@/components/value-stack"
import { Testimonials } from "@/components/testimonials"
import { Founders } from "@/components/founders"
import { DiscordCTA } from "@/components/discord-cta"
import { FAQ } from "@/components/faq"
import { FinalCTA } from "@/components/final-cta"
import { Footer } from "@/components/footer"
import { ExitPopup } from "@/components/exit-popup"
import { Navbar } from "@/components/navbar"

export default function Home() {
  const [showExitPopup, setShowExitPopup] = useState(false)
  const [hasShownPopup, setHasShownPopup] = useState(false)

  useEffect(() => {
    const alreadyShown = localStorage.getItem("ggpc_exit_shown")
    if (alreadyShown) {
      setHasShownPopup(true)
    }
  }, [])

  useEffect(() => {
    if (hasShownPopup) return

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 10) {
        setShowExitPopup(true)
        setHasShownPopup(true)
        localStorage.setItem("ggpc_exit_shown", "true")
      }
    }

    const mobileTimer = setTimeout(() => {
      if (window.innerWidth < 768 && !hasShownPopup) {
        setShowExitPopup(true)
        setHasShownPopup(true)
        localStorage.setItem("ggpc_exit_shown", "true")
      }
    }, 45000)

    document.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave)
      clearTimeout(mobileTimer)
    }
  }, [hasShownPopup])

  return (
    <main className="min-h-screen overflow-x-hidden" style={{ backgroundColor: "#0D0D0D", color: "#FFFFFF" }}>
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <ProductPreview />
      <HowItWorks />
      <ValueStack />
      <Testimonials />
      <Founders />
      <DiscordCTA />
      <FAQ />
      <FinalCTA />
      <Footer />
      <ExitPopup isOpen={showExitPopup} onClose={() => setShowExitPopup(false)} />
    </main>
  )
}
