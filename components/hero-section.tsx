import Image from "next/image"
import { Gamepad2, Gift } from "lucide-react"
import { WaitlistForm } from "@/components/waitlist-form"

export function HeroSection() {
  return (
    <section className="hero" aria-labelledby="hero-heading">
      <div className="hero-art"><Image src="/images/hero-workbench.webp" alt="A PC case, motherboard, RAM and graphics card laid out on a workbench" fill priority sizes="100vw" /></div>
      <div className="hero-inner page-width">
        <div className="hero-copy">
          <h1 id="hero-heading"><span>BUILD.</span><span>COMPARE.</span><span>GAME.</span></h1>
          <h2 className="hero-proposition">Your first PC, with fewer expensive guesses.</h2>
          <p>Compare UAE part prices, check compatibility, and get help choosing what fits your budget.</p>
          <WaitlistForm id="signup" />
          <a className="hero-perk-link" href="#perks"><Gift size={19} aria-hidden="true" /><span>First 100: 10% off your first custom build + a free consultation.</span></a>
          <a className="hero-quest-link" href="#build-quest"><Gamepad2 size={18} aria-hidden="true" /> Find your build quest</a>
        </div>
      </div>
    </section>
  )
}
