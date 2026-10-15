import { Glyph, Sprite } from "@/components/pixel"
import { RetailerMark, gpuVendors } from "@/components/product-preview"
import type { SpriteName } from "@/lib/pixel-art"

// Slot borders show the part's price tier in the example build, not a quality rating.
export const tiers = {
  low: { name: "Amber", range: "under AED 700" },
  mid: { name: "Orange", range: "AED 700 to 2,000" },
  high: { name: "Red", range: "over AED 2,000" },
} as const
type Tier = keyof typeof tiers
type Slot = { label: string; item: string; sprite: SpriteName; scale: number; tier: Tier; selected?: boolean }

const left: Slot[] = [
  { label: "CPU", item: "Ryzen 7 7700X", sprite: "cpu", scale: 3, tier: "mid" },
  { label: "Memory", item: "32GB DDR5 6000", sprite: "ram", scale: 2, tier: "low" },
  { label: "Storage", item: "2TB NVMe SSD", sprite: "ssd", scale: 2, tier: "low" },
]
const right: Slot[] = [
  { label: "GPU", item: "RTX 4070 Ti SUPER", sprite: "gpu", scale: 2, tier: "high", selected: true },
  { label: "Board", item: "B650 motherboard", sprite: "motherboard", scale: 2, tier: "mid" },
  { label: "Power", item: "850W Gold PSU", sprite: "psu", scale: 2, tier: "low" },
]

function SlotList({ slots, side }: { slots: Slot[]; side: string }) {
  return (
    <ul className={`slots slots-${side}`}>
      {slots.map(slot => (
        <li key={slot.label} className={`slot tier-${slot.tier}${slot.selected ? " is-selected" : ""}`}>
          <span className="slot-tile"><Sprite name={slot.sprite} scale={slot.scale} /></span>
          <span className="slot-label">{slot.label}</span>
          <span className="sr-only">: {slot.item}, {tiers[slot.tier].name.toLowerCase()} price tier{slot.selected ? ", selected" : ""}</span>
        </li>
      ))}
    </ul>
  )
}

export function Loadout() {
  return (
    <figure className="loadout" aria-labelledby="loadout-caption">
      <div className="loadout-stage frame">
        <p className="stage-bar"><span>Loadout</span><span className="stage-fit"><Glyph name="check" size={16} /> 6/6 fit</span></p>
        <div className="stage-body">
          <SlotList slots={left} side="left" />
          <div className="doll">
            <div className="doll-inner">
              <Sprite name="spotlight" className="doll-light" />
              <Sprite name="rig" scale={6} className="doll-rig" />
            </div>
          </div>
          <SlotList slots={right} side="right" />
        </div>
        <dl className="stage-stats">
          <div><dt>Build total</dt><dd>AED 6,433</dd></div>
          <div><dt>Power</dt><dd>520W / 850W</dd></div>
        </dl>
        <ul className="tier-key" aria-label="Slot border colours show price tiers">
          {(Object.keys(tiers) as Tier[]).map(tier => <li key={tier} className={`tier-${tier}`}><span className="tier-swatch" aria-hidden="true" />{tiers[tier].range}</li>)}
        </ul>
      </div>
      <div className="tooltip frame" role="group" aria-label="Selected item: RTX 4070 Ti SUPER">
        <p className="tip-name">RTX 4070 Ti SUPER</p>
        <p className="tip-type">Graphics card <span aria-hidden="true">·</span> Red price tier</p>
        <dl className="tip-stats">
          <div><dt>Memory</dt><dd>16GB GDDR6X</dd></div>
          <div><dt>Boost clock</dt><dd>2.61 GHz</dd></div>
          <div><dt>Graphics power</dt><dd>285W</dd></div>
          <div><dt>CUDA cores</dt><dd>8,448</dd></div>
        </dl>
        <p className="tip-fit"><Glyph name="check" size={16} /> Fits this build: power and case clearance OK</p>
        <div className="tip-vendors">
          <p className="tip-heading">3 UAE vendors, AED</p>
          <ul className="tip-vendor-list">
            {gpuVendors.map(vendor => (
              <li key={vendor.store} className={vendor.best ? "is-best" : undefined}>
                <RetailerMark logo={vendor.logo} image={vendor.image} size={vendor.size} />
                <span className="tip-vendor-name">{vendor.store}{vendor.best && <span className="sr-only">, best price</span>}</span>
                <span className="tip-vendor-price">{vendor.price}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="tip-flavor">“Three fans. One job: more frames.”</p>
      </div>
      <figcaption id="loadout-caption" className="loadout-note">Example build. Illustrative prices, not live offers.</figcaption>
    </figure>
  )
}
