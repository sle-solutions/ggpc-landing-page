import { Glyph } from "@/components/pixel"
import { Loadout } from "@/components/loadout"
import { WaitlistForm } from "@/components/waitlist-form"

export function HeroSection() {
  return (
    <section className="hero" aria-labelledby="hero-heading">
      <div className="hero-grid page-width">
        <div className="hero-copy">
          <h1 id="hero-heading" className="slogan"><span>BUILD.</span><span>COMPARE.</span><span className="slogan-hot">GAME.</span></h1>
          <p className="hero-lede">Gear up your first PC one slot at a time. Every part checked for fit, every price compared across UAE stores.</p>
          <WaitlistForm id="signup" />
        </div>
        <Loadout />
        <div className="hero-extras">
          <a className="og-offer" href="#perks">
            <span className="og-gem"><Glyph name="gem" size={32} /></span>
            <span><strong>First 100 to join:</strong> 10% off your first custom build and a free consultation.</span>
          </a>
          <a className="text-link hero-quest" href="#quest"><Glyph name="gamepad" size={16} /> Or try the build quest</a>
        </div>
      </div>
    </section>
  )
}
