import { Glyph } from "@/components/pixel"
import type { GlyphName } from "@/lib/pixel-art"

const debuffs: { icon: GlyphName; name: string; effect: string; cure: string }[] = [
  { icon: "tag2x", name: "Double price", effect: "Everything costs 2x. UAE stores stack insane markups, and there's no easy way to compare them.", cure: "UAE store prices side by side, in AED." },
  { icon: "brokenLink", name: "Mismatch", effect: "Will these parts even work together? One wrong click and your new rig is an expensive paperweight.", cure: "Every part checked for fit as you add it." },
  { icon: "haggle", name: "Haggle fatigue", effect: "Nobody wants to bargain at Computer Plaza. You're not a used car salesman. You just want a fair price.", cure: "Every store's price before you leave home." },
  { icon: "ioShield", name: "Fear of breaking it", effect: "That IO shield haunts your dreams. One wrong move and it's game over.", cure: "Build help, or have it built, tested and delivered." },
]

export function ProblemSection() {
  return (
    <section id="debuffs" className="debuffs" aria-labelledby="debuffs-heading">
      <div className="page-width">
        <div className="debuffs-head">
          <h2 id="debuffs-heading">Building a PC in the UAE? <span>You spawn with four debuffs.</span></h2>
        </div>
        <ul className="debuff-list">
          {debuffs.map(debuff => (
            <li key={debuff.name} className="debuff">
              <span className="debuff-icon"><Glyph name={debuff.icon} size={32} /></span>
              <div className="debuff-body">
                <h3>{debuff.name}</h3>
                <p>{debuff.effect}</p>
              </div>
              <p className="debuff-cure"><span className="cure-label">Cure</span><span>{debuff.cure}</span></p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
