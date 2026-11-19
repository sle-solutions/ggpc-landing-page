import { Glyph } from "@/components/pixel"
import { Loadout } from "@/components/loadout"
import { InstallButton } from "@/components/install-button"

export function HeroSection() {
  return (
    <section className="hero bench-hero" aria-labelledby="hero-heading">
      <div className="page-width bench-layout">
        <div className="bench-intro">
          <h1 id="hero-heading">Plan your<br /><em>first PC.</em></h1>
          <p>Compare UAE store prices and check which parts fit, right beside the product page.</p>
          <div className="bench-actions" id="install">
            <InstallButton />
            <a className="text-link" href="/builder">Open web builder <Glyph name="arrowRight" /></a>
          </div>
          <details className="market-details">
            <summary>Desktop Chrome · UAE only</summary>
            <p>Install worldwide. Sign in to compare supported UAE stores in AED. More countries coming soon.</p>
          </details>
        </div>
        <Loadout />
      </div>
    </section>
  )
}
