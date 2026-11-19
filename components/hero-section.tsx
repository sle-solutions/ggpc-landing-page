import { ArrowRight } from "lucide-react"
import { Loadout } from "@/components/loadout"
import { InstallButton } from "@/components/install-button"

export function HeroSection() {
  return (
    <section className="hero bench-hero" aria-labelledby="hero-heading">
      <div className="page-width bench-layout">
        <div className="bench-intro">
          <h1 id="hero-heading"><span>Compare UAE prices.</span>{" "}<em>See which PC parts fit.</em></h1>
          <p>Check five UAE stores from the product page, or start a parts list in the web builder.</p>
          <div className="bench-actions" id="install">
            <InstallButton />
            <a className="text-link" href="/builder">Open web builder <ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" /></a>
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
