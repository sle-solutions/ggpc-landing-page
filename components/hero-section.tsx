import { Glyph } from "@/components/pixel"
import { Loadout } from "@/components/loadout"
import { InstallButton } from "@/components/install-button"

export function HeroSection() {
  return <section className="hero" aria-labelledby="hero-heading">
    <div className="hero-grid page-width">
      <div className="hero-copy">
        <h1 id="hero-heading" className="slogan"><span>BUILD.</span>{" "}<span>COMPARE.</span>{" "}<span className="slogan-hot">GAME.</span></h1>
        <p className="hero-lede">Gear up your first PC one slot at a time. Compare UAE part prices and check compatibility before you buy.</p>
        <div className="hero-actions" id="install">
          <p className="hero-define">Your PC build, beside the store page. Open GG PC in Chrome to compare parts, plan a build and track prices.</p>
          <InstallButton />
          <p className="market-notice"><strong>UAE only.</strong> Desktop Chrome. Supported stores, AED prices and build services are for the UAE. Install worldwide. More countries coming soon.</p>
        </div>
      </div>
      <Loadout />
      <div className="hero-extras">
        <a className="text-link" href="/builder"><Glyph name="wrench" size={16} />Prefer the web? Open the builder</a>
        <a className="text-link hero-quest" href="#quest"><Glyph name="gamepad" size={16} />Find your starting point in the build quest</a>
      </div>
    </div>
  </section>
}
