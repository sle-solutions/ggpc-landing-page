import { Glyph, Sprite } from "@/components/pixel"
import { WaitlistForm } from "@/components/waitlist-form"
import type { GlyphName } from "@/lib/pixel-art"

const perks: { icon: GlyphName; name: string; detail: string }[] = [
  { icon: "key", name: "Early access", detail: "Use the price comparison tool before anyone else." },
  { icon: "percent", name: "10% off", detail: "Take 10% off your first custom build." },
  { icon: "headset", name: "Free consultation", detail: "One-on-one help planning your perfect rig." },
  { icon: "scroll", name: "Exclusive guides", detail: "UAE-specific build guides and pricing reports." },
  { icon: "bell", name: "Launch updates", detail: "Be first to know when we go live." },
]

export function FinalCTA() {
  return (
    <section id="perks" className="og" aria-labelledby="og-heading">
      <div className="page-width og-grid">
        <div className="og-head">
          <h2 id="og-heading">Join the first 100.</h2>
          <p className="og-punch">Unlock OG loot.</p>
        </div>
        <div className="og-loot">
          <div className="og-chest" aria-hidden="true"><Sprite name="chest" scale={6} /></div>
          <p className="og-intro">The first 100 waitlist members get:</p>
          <ul className="loot-list">
            {perks.map(perk => (
              <li key={perk.name} className="loot">
                <span className="loot-slot"><Glyph name={perk.icon} size={32} /></span>
                <span className="loot-text"><span className="loot-name">{perk.name}</span><span className="loot-detail">{perk.detail}</span></span>
              </li>
            ))}
          </ul>
        </div>
        <div className="og-signup frame">
          <h3>Claim your spot</h3>
          <p className="og-signup-sub">One email. That's the whole entry fee.</p>
          <WaitlistForm id="closing-signup" dark buttonLabel="Claim my spot" note="No spam, pinky promise. Unsubscribe anytime." />
        </div>
      </div>
    </section>
  )
}
