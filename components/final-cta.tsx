import { Check, Sparkles } from "lucide-react"
import { WaitlistForm } from "@/components/waitlist-form"

const perks = [
  "Early access to the price comparison tool before anyone else",
  "10% off your first custom build",
  "Free consultation - 1-on-1 help planning your perfect rig",
  "Exclusive guides - UAE-specific build guides and pricing reports",
  "Launch updates - Be first to know when we go live",
]

export function FinalCTA() {
  return (
    <section id="perks" className="final-section" aria-labelledby="final-heading">
      <div className="page-width final-layout">
        <div className="final-heading-block"><h2 id="final-heading">Join the <br />first 100.</h2><p className="final-vip">Get the VIP <br />treatment.</p></div>
        <div className="founding-benefits"><h3><Sparkles size={25} aria-hidden="true" /> OG MEMBER PERKS</h3><p>The first 100 waitlist members get:</p><ul>{perks.map(perk => <li key={perk}><Check size={19} aria-hidden="true" /><span>{perk}</span></li>)}</ul></div>
        <div className="final-signup"><h3>Join the waitlist</h3><WaitlistForm id="closing-signup" dark buttonLabel="Claim My Spot" note="No spam, pinky promise. Unsubscribe anytime." /></div>
      </div>
    </section>
  )
}
