import { Glyph, Sprite } from "@/components/pixel"
import { InstallButton } from "@/components/install-button"

export function FinalCTA() {
  return <section id="get-started" className="og" aria-labelledby="og-heading"><div className="page-width og-grid">
    <div className="og-head"><h2 id="og-heading">Your next build starts here.</h2><p className="og-punch">Pick your next move.</p></div>
    <div className="og-loot"><div className="og-chest" aria-hidden="true"><Sprite name="chest" scale={6} /></div><p className="og-intro">Compare parts while you shop, or start with a web loadout picked from current UAE store observations.</p><InstallButton /><p className="market-notice">UAE only. Install worldwide. More countries coming soon.</p></div>
    <div className="og-signup frame"><h3>Want it built for you?</h3><p className="og-signup-sub">Choose a loadout, review the parts and fees, then ask for a WhatsApp quote. Online card checkout is not available yet.</p><a className="btn btn-ghost" href="/builder">Open the builder<Glyph name="arrowRight" size={16} /></a><a className="text-link" href="/warranty">See build QA and warranty details</a></div>
  </div></section>
}
